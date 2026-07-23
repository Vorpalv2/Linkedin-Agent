Most "AI agents" are just a ChatGPT wrapper duct-taped to a cron job.

This project is a different animal.

I built a LinkedIn Content Agent on top of Vercel Eve — a new agentic framework that treats AI workflows as first-class, deployable primitives. You drop a GitHub repo URL into it, and the agent autonomously clones the repo, inspects its stack, writes a high-engagement LinkedIn post, saves it to disk, and publishes it directly to your LinkedIn feed via the official API.

No orchestration boilerplate. No hand-rolled API clients. Just declared tools and a model config.

🔩 The stack:
→ Eve (^0.26.2) — the core agent runtime and deployment layer
→ Vercel AI SDK (v7) — streaming model calls, tool-use primitives
→ Anthropic Claude Sonnet 4.6 — the reasoning engine
→ Zod 4 — schema-first tool input validation
→ @vercel/connect — OIDC-based secure agent auth
→ TypeScript 7 + Node 24 — modern ESM-first runtime

⚔️ The Old Way vs. The New Way

❌ Old Way:

- Spin up a FastAPI/Express server to host your LLM logic
- Write custom tool-calling parsers by hand
- Manage your own streaming, error retries, and auth middleware
- Deploy it separately, wire up env vars manually, hope it scales

✅ This Way (Eve):

- `defineTool()` → your tool is instantly typed, validated, and LLM-callable
- `defineAgent()` → one config object wires model + tools + instructions
- `eveChannel()` with `vercelOidc()` → production-grade auth in 3 lines
- `eve build` / `eve dev` → deploy or run locally with zero infra config

The tool architecture is the cleanest part. Each capability (cloning a repo, reading files, posting to LinkedIn, saving outputs, storing API keys) is its own isolated `defineTool()` module. The agent picks and chains them autonomously based on the task.

That's the shift: you stop writing orchestration logic and start declaring capabilities.

The LinkedIn posting tool itself is a good example — it hits the LinkedIn `/rest/posts` API with the correct `202603` versioning header, pulls the user's Person URN from OpenID's `/userinfo` endpoint, and handles the missing-key fallback gracefully. All of that complexity is invisible to the agent's reasoning loop.

If you've been sleeping on Eve, this is a solid proof-of-concept of what agentic tooling looks like when the framework does its job properly.

GitHub → https://github.com/Vorpalv2/Linkedin-Agent

#AI #Agents #Vercel #TypeScript #LLM #DeveloperTools #LinkedInAPI
