# LinkedIn Repo Storyteller CLI

A small terminal client for the LinkedIn Repo Storyteller Eve agent. It runs on your computer, collects a public GitHub repository URL, and sends it to the agent hosted on Vercel.

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

The URL must point to an Eve deployment that permits this client to create sessions. The CLI currently sends no authentication credentials.
