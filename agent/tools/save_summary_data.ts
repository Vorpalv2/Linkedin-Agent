import { defineTool } from "eve/tools";
import z from "zod";
import fs from "node:fs";

export default defineTool({
  description:
    "Prepares the generated LinkedIn post for saving. In local development, writes a timestamped copy into the project directory. On Vercel, returns the post to the connected CLI so it can save it on the user's computer.",
  inputSchema: z.object({
    summarizedText: z.string().describe("summary of the cloned repo"),
  }),
  async execute({ summarizedText }) {
    if (process.env.VERCEL) {
      return { success: true, contentToSave: summarizedText };
    }

    const fileName = `${Date.now()}-linkedin-summary.md`;
    fs.appendFileSync(fileName, summarizedText, { encoding: "utf-8" });
    return { success: true, fileName };
  },
});
