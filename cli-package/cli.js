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
  console.log("Paste a public GitHub repository URL to get started.\n");
}

function normalizeGitHubUrl(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts.some((part) => part === "." || part === "..")) {
    return null;
  }

  const [owner, repository] = parts;
  return `https://github.com/${owner}/${repository.replace(/\.git$/i, "")}`;
}

async function askForRepository() {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const answer = await terminal.question("\x1b[36m›\x1b[0m GitHub repo URL: ");
      const repoUrl = normalizeGitHubUrl(answer);
      if (repoUrl) return repoUrl;
      console.log("Please enter a repository URL like https://github.com/owner/repo.\n");
    }
  } finally {
    terminal.close();
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
  const repoUrl = await askForRepository();

  console.log(`\n\x1b[2mConnecting to ${agentUrl}…\x1b[0m`);
  console.log("\x1b[33m⠋\x1b[0m Starting repository analysis…\n");

  const client = new Client({ host: agentUrl });
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
