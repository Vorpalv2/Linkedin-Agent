import { defineTool } from "eve/tools";
import z from "zod";

export default defineTool({
  description:
    "Generate shield badges for a tech stack based on a README or project summary.",
  inputSchema: z.object({
    summary: z.string().describe("Summary of the readme file"),
    // Let the AI generate and structure the array
    techStack: z
      .array(
        z.object({
          tech: z
            .string()
            .describe("The technology name, e.g. 'React' or 'Node.js'"),
          logo: z
            .string()
            .describe(
              "The Simple Icons slug for the tech logo, e.g. 'react', 'typescript', or 'nodedotjs'",
            ),
          color: z
            .string()
            .describe("Hex color code without '#' symbol, e.g. '61DAFB'"),
        }),
      )
      .describe(
        "List of technologies extracted from the project to generate badges for",
      ),
  }),
  async execute({ summary, techStack }) {
    // techStack is automatically typed as { tech: string; logo: string; color: string }[]
    const badgeResponses = await Promise.all(
      techStack.map(({ tech, logo, color }) => {
        const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(tech)}-${color}?logo=${logo}`;
        return fetch(badgeUrl);
      }),
    );

    return {
      success: true,
      summary,
      processedBadges: badgeResponses.length,
    };
  },
});
