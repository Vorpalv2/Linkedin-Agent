#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { Client } from "eve/client";

const defaultAgentUrl = "https://linkedin-agent-ivory.vercel.app";
const agentUrl = process.env.LINKEDIN_AGENT_URL ?? defaultAgentUrl;

function printWelcome() {
  console.log(`\n\x1b[36m╭──────────────────────────────────────────────────────╮[0m`);
  console.log(`\x1b[36m│\x1b[0m              \x1b[1mLINKEDIN REPO STORYTELLER\x1b[0m              \x1b[36m│\x1b[0m`);
  console.log(`\x1b[36m│\x1b[0m  Turn the engineering behind a repo into a post.   \x1b[36m│\x1b[0m`);
  console.log(`\x1b[36m╰──────────────────────────────────────────────────────╯\x1b[0m\n`);
  console.log("I’ll explore the project and draft a LinkedIn post for you.");
  console.log("Paste a public GitHub repository URL, optionally with a /tree/branch path.\n");
}

function normalizeGitHubUrl(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) return null;

  let parts;
  try {
    parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }

  if (parts.some((part) => part === "." || part === "..")) return null;

  const [owner, rawRepository, route, ...branchParts] = parts;
  if (!owner || !rawRepository || owner.includes("/") || rawRepository.includes("/") || !/^[\w-]+$/.test(owner)) return null;

  const repository = rawRepository.replace(/\.git$/i, "");
  if (!repository || repository === "." || repository === ".." || !/^[\w.-]+$/.test(repository)) return null;

  let branch = null;
  if (parts.length === 2) {
    // Repository root: analyze the default branch.
  } else if (route === "tree" && branchParts.length > 0) {
    branch = branchParts.join("/");
    if (
      branch.startsWith("/") ||
      branch.endsWith("/") ||
      branch === "@" ||
      branch.includes("//") ||
      branch.includes("..") ||
      branch.includes("@{") ||
      /[\x00-\x20\x7f~^:?*\\[]/.test(branch) ||
      branch.split("/").some((part) => part.startsWith(".") || part.endsWith(".") || /\.lock$/i.test(part))
    ) return null;
  } else {
    return null;
  }

  const encodedRepository = encodeURIComponent(repository);
  if (!branch) return `https://github.com/${owner}/${encodedRepository}`;

  const encodedBranch = branch.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${owner}/${encodedRepository}/tree/${encodedBranch}`;
}

async function askForRepository() {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const answer = await terminal.question("\x1b[36m›\x1b[0m GitHub repo URL: ");
      const repoUrl = normalizeGitHubUrl(answer);
      if (repoUrl) return repoUrl;
      console.log("Enter a URL like https://github.com/owner/repo or https://github.com/owner/repo/tree/branch-name.\n");
    }
  } finally {
    terminal.close();
  }
}

async function askForGatewayKey() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("The Gateway API key prompt requires an interactive terminal so the key can stay hidden.");
  }

  stdout.write("\x1b[1mVercel AI Gateway API key\x1b[0m (input hidden): ");
  stdin.setRawMode(true);
  stdin.resume();
  let value = "";

  try {
    return await new Promise((resolve, reject) => {
      const onData = (chunk) => {
        for (const character of chunk.toString("utf8")) {
          if (character === "\u0003" || character === "\u001b") {
            cleanup();
            reject(new Error("Gateway API key entry cancelled."));
            return;
          }
          if (character === "\r" || character === "\n") {
            const apiKey = value.trim();
            cleanup();
            if (!apiKey) {
              reject(new Error("A Vercel AI Gateway API key is required to run an analysis."));
            } else {
              resolve(apiKey);
            }
            return;
          }
          if (character === "\u007f" || character === "\b") {
            if (value.length) {
              value = value.slice(0, -1);
              stdout.write("\b \b");
            }
            continue;
          }
          if (character >= " ") {
            value += character;
            stdout.write("•");
          }
        }
      };

      function cleanup() {
        stdin.off("data", onData);
        stdin.setRawMode(false);
        stdout.write("\n");
      }

      stdin.on("data", onData);
    });
  } finally {
    if (stdin.isRaw) stdin.setRawMode(false);
  }
}

function describeError(error) {
  if (error?.status) {
    return `The Eve server returned HTTP ${error.status}${error.body ? `: ${error.body}` : "."}`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function getDesktopPath() {
  const desktopPaths = [];
  if (process.platform === "win32") {
    for (const oneDrivePath of [process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial]) {
      if (oneDrivePath) desktopPaths.push(path.join(oneDrivePath, "Desktop"));
    }
  }
  desktopPaths.push(path.join(homedir(), "Desktop"));

  for (const desktopPath of desktopPaths) {
    try {
      if ((await stat(desktopPath)).isDirectory()) return desktopPath;
    } catch {
      // Try the next conventional Desktop location.
    }
  }

  const defaultDesktop = path.join(homedir(), "Desktop");
  try {
    await mkdir(defaultDesktop, { recursive: true });
    return defaultDesktop;
  } catch {
    throw new Error("Could not access a Desktop folder to save the LinkedIn draft.");
  }
}

async function saveDraftToDesktop(text) {
  const desktopPath = await getDesktopPath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(desktopPath, `linkedin-post-${timestamp}.md`);
  await writeFile(filePath, `${text.trim()}\n`, { encoding: "utf8", flag: "wx" });
  return filePath;
}

async function main() {
  printWelcome();
  const gatewayApiKey = await askForGatewayKey();
  const repoUrl = await askForRepository();

  console.log(`\n\x1b[2mConnecting to ${agentUrl}…\x1b[0m`);
  console.log("\x1b[33m⠋\x1b[0m Starting repository analysis…\n");

  const client = new Client({
    host: agentUrl,
    headers: () => ({ "x-eve-gateway-key": gatewayApiKey }),
    redirect: "error",
  });
  const { response } = await client.sessions.create({
    message: `Analyze this GitHub repository and draft a LinkedIn post: ${repoUrl}`,
  });

  let wroteAssistantText = false;
  let assistantText = "";
  let draftToSave = "";
  for await (const event of response) {
    if (event.type === "message.appended") {
      assistantText += event.data.messageDelta;
      if (!wroteAssistantText) {
        stdout.write("\n");
        wroteAssistantText = true;
      }
      stdout.write(event.data.messageDelta);
    } else if (event.type === "action.result") {
      const result = event.data.result;
      if (result.kind === "tool-result" && result.output && typeof result.output === "object") {
        const contentToSave = result.output.contentToSave;
        if (typeof contentToSave === "string") draftToSave = contentToSave;
      }
    } else if (event.type === "actions.requested") {
      const actions = event.data.actions ?? [];
      const labels = actions.map((action) => action.label ?? action.name).filter(Boolean);
      if (labels.length) console.log(`\n\x1b[2mWorking: ${labels.join(", ")}…\x1b[0m`);
    } else if (event.type === "session.failed") {
      throw new Error("The agent session failed. Check the deployment logs and try again.");
    }
  }

  if (wroteAssistantText) stdout.write("\n");
  const draft = draftToSave || assistantText.trim();
  if (draft) {
    const savedPath = await saveDraftToDesktop(draft);
    console.log(`\n\x1b[32m✓ Analysis finished. Draft saved to ${savedPath}\x1b[0m`);
  } else {
    console.log("\n\x1b[32m✓ Analysis finished.\x1b[0m");
    console.log("No draft text was returned to save.");
  }
}

main().catch((error) => {
  console.error(`\n\x1b[31mCould not complete the analysis:\x1b[0m ${describeError(error)}`);
  process.exitCode = 1;
});
