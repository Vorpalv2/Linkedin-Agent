import { defineTool } from "eve/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export default defineTool({
  description:
    "Reads the text contents of a specific project manifest or source file within the cloned sandbox.",
  inputSchema: z.object({
    workspacePath: z
      .string()
      .describe("The workspace path returned by the cloneRepo tool."),
    fileName: z
      .string()
      .describe(
        "The relative path of the file to read (e.g., 'package.json' or 'src/index.ts').",
      ),
  }),
  execute: async ({
    workspacePath,
    fileName,
  }: {
    workspacePath: string;
    fileName: string;
  }) => {
    const filePath = path.join(workspacePath, fileName);

    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found at ${fileName}` };
      }

      const content = fs.readFileSync(filePath, "utf-8");
      return {
        success: true,
        content: content.slice(0, 15000), // Caps content size safely
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});
