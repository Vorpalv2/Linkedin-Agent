import { defineTool } from "eve/tools";
import z from "zod";
import fs from "node:fs";

export default defineTool({
  description: "Saves the data generated from LLM summary into a text file",
  inputSchema: z.object({
    summarizedText: z.string().describe("summary of the cloned repo"),
  }),
  async execute({ summarizedText }) {
    fs.appendFileSync(`${Date.now()}-linkedin-summary.txt`, summarizedText, {
      encoding: "utf-8",
    });
  },
});
