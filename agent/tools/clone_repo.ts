import fs from "node:fs";
import { defineTool } from "eve/tools";
import z from "zod";
import * as path from "path";
import { execSync } from "node:child_process";
export default defineTool({
  description:
    "Clones a public GitHub repository baseline into the local workspace sandbox for structural analysis.",
  inputSchema: z.object({
    repoUrl: z
      .string()
      .url()
      .regex(
        /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/,
        "Must be a valid public GitHub repo URL",
      )
      .describe("The full HTTPS URL of the public GitHub repository."),
  }),
  execute: async ({ repoUrl }) => {
    const repoName =
      repoUrl
        .split("/")
        .pop()
        ?.replace(/\.git$/, "") || "target-repo";
    const targetPath = path.join(process.cwd(), ".sandbox", repoName);

    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }

      // Shallow clone keeps it ultra fast
      execSync(`git clone --depth 1 ${repoUrl} ${targetPath}`, {
        stdio: "ignore",
      });
      const files = fs.readdirSync(targetPath);

      return {
        success: true,
        message: `Successfully cloned ${repoName}.`,
        workspacePath: targetPath,
        rootContents: files,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});
