import { defineTool } from "eve/tools";
import z from "zod";

export default defineTool({
  description:
    "Publishes the generated repository summary directly as a LinkedIn post.",
  inputSchema: z.object({
    postContent: z
      .string()
      .describe(
        "The final, optimized markdown text content for the LinkedIn post.",
      ),
  }),
  async execute({ postContent }) {
    try {
      console.log("Preparing LinkedIn post text...");

      const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      if (!accessToken) {
        return {
          status: "MISSING_KEY",
          message: "LINKEDIN_ACCESS_TOKEN environment variable is missing.",
        };
      }

      console.log("Fetching LinkedIn Profile ID...");

      // 1. Get the authenticated user's profile ID (Person URN)
      const profileResponse = await fetch(
        "https://api.linkedin.com/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!profileResponse.ok) {
        const errText = await profileResponse.text();
        return {
          success: false,
          error: `Failed to fetch profile info: ${errText}`,
        };
      }

      const profileData = await profileResponse.json();
      // OpenID returns sub field which corresponds to the person ID
      const personUrn = `urn:li:person:${profileData.sub}`;

      console.log(
        `Authenticated as ${profileData.name} (${personUrn}). Publishing post...`,
      );

      // 2. Publish to LinkedIn Posts API (/rest/posts)
      const postPayload = {
        author: personUrn,
        commentary: postContent,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
      };

      const response = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202603",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        const errorDetails = await response.text();
        return {
          success: false,
          error: `LinkedIn API error (${response.status}): ${errorDetails}`,
        };
      }

      // LinkedIn returns the new Post URN in the x-restli-id response header
      const postId = response.headers.get("x-restli-id") || "published";

      return {
        success: true,
        message: "Post successfully published to your LinkedIn feed!",
        postId: postId,
      };
    } catch (error: any) {
      return {
        success: "false",
        error: `LinkedIn Broadcast Pipeline Exception: ${error.message}`,
      };
    }
  },
});
