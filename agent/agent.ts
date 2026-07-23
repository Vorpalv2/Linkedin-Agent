import { defineAgent } from "eve";
export default defineAgent({
  model: "anthropic/claude-sonnet-4.6",
  // modelContextWindowTokens: 1000000,
  // modelOptions: {
  //   providerOptions: {
  //     gateway: {
  //       secondaryModel: "moonshotai/kimi-k3",
  //       primaryModel: "anthropic/claude-sonnet-4.5",
  //     },
  //   },
  // },
});
