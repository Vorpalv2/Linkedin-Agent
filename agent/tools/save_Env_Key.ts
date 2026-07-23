import { defineTool } from "eve/tools";
import z from "zod";
import * as fs from "fs";
import * as path from "path";

export default defineTool({
  description:
    "Saves the user's provided LinkedIn API Access Token into runtime environment and persists it to the .env file.",
  inputSchema: z.object({
    linkedinkey: z
      .string()
      .describe("LinkedIn API Access Token string provided by the user."),
  }),
  async execute({ linkedinkey }) {
    try {
      const trimmedKey = linkedinkey.trim();

      // 1. Update in-memory process environment
      process.env.LINKEDIN_ACCESS_TOKEN = trimmedKey;

      // 2. Persist to .env file on disk
      const envPath = path.resolve(process.cwd(), ".env");
      const envLine = `\nLINKEDIN_ACCESS_TOKEN="${trimmedKey}"\n`;

      fs.appendFileSync(envPath, envLine, "utf-8");

      return {
        success: true,
        message:
          "LinkedIn Access Token successfully saved to memory and persisted to .env file!",
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to save token to .env file: ${error.message}`,
      };
    }
  },
});
