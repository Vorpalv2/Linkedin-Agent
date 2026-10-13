# LinkedIn Repo Storyteller CLI

A small terminal client for the LinkedIn Repo Storyteller Eve agent. It runs on your computer, securely prompts for your Vercel AI Gateway API key and a public GitHub repository URL, then sends them to the agent hosted on Vercel.

When the analysis completes, the CLI saves the generated Markdown draft in the user's Desktop folder. On Windows, it checks the standard Desktop folder and common OneDrive Desktop locations.

## Requirements

- Node.js 24 or later
- Internet access

## Run without installing

```bash
npx linkedin-repo-storyteller-cli
```

Or install it globally:

```bash
npm install --global linkedin-repo-storyteller-cli
linkedin-repo-storyteller-cli
```

The CLI connects to `https://linkedin-agent-ivory.vercel.app` by default. Set `LINKEDIN_AGENT_URL` to use another Eve deployment:

```bash
LINKEDIN_AGENT_URL=https://your-agent.vercel.app npx linkedin-repo-storyteller-cli
```

The URL must point to an Eve deployment configured for this CLI and with `EVE_GATEWAY_KEY_ENCRYPTION_SECRET` set. The CLI asks for your Vercel AI Gateway API key every time it runs, masks the input, and does not save it on your computer. The key is sent to the deployment over HTTPS and encrypted before it is stored in Eve session auth metadata. Model usage is billed to the Gateway account associated with the key.

To analyze the default branch, enter the repository URL. To analyze a specific branch, enter the GitHub branch URL. Branch names containing slashes are supported:

```text
https://github.com/owner/repo
https://github.com/owner/repo/tree/feature/my-branch
```

The key is required to run an analysis. Get one from your Vercel AI Gateway settings. Do not share it with anyone.
