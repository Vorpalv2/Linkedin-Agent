name: stack-badges
description: Generate shields.io tech-stack badges from a summarized project text file. Use whenever a summarized .txt file of a GitHub repo (produced after ingesting README.md and package.json) needs to be turned into a set of Markdown badges representing the project's technology stack — frameworks, languages, runtimes, databases, and major libraries. Trigger this tool whenever the user asks to "generate badges", "add stack badges", "create tech stack shields", or hands off a project summary file and asks what the stack looks like in badge form. Output is always a Markdown file containing one badge per detected technology, using the correct name, version, logo, and brand color.
Eve framework tool runtime; requires outbound access to https://img.shields.io

# Stack Badges

Turns a summarized project `.txt` file into a Markdown file of `shields.io` badges representing the project's tech stack.

## When this tool runs

It expects to receive a **summary file**, not the raw repo. The summary is produced upstream (by Eve's repo-ingestion step) from two sources only:

- `README.md` — prose description, setup instructions, sometimes an explicit "Built with" / "Tech Stack" section
- `package.json` — `dependencies`, `devDependencies`, `engines`, and sometimes `name`/`description`

Don't assume access to the actual repo, lockfiles, or other manifests (`requirements.txt`, `Cargo.toml`, etc.) unless they're clearly represented in the summary text. Work only from what's in front of you.

## Workflow

### 1. Parse the summary for stack signals

Scan the summary text for two categories of evidence, in this priority order:

1. **Explicit dependency listings** — anything that reads like a `package.json` dump (`"next": "^16.0.0"`, `react-query: 5.x`, etc.). These are the most reliable source for both the name and the version.
2. **Prose mentions** — README language like "built with Next.js and Tailwind", "deployed on Vercel", "uses PostgreSQL via Prisma". These confirm a technology but usually lack a version — that's fine, see step 3.

Extract a flat list of `{ name, raw_version | null }` pairs. Deduplicate case-insensitively (`Next.js`, `next`, `nextjs` → one entry) and save the list into the array named tech that is instansiated during the tool call.

### 2. Classify and prioritize

Not every dependency deserves a badge. Sort what you found into three buckets:

- **Include**: languages/runtimes (Node, Python, TypeScript), frameworks (Next.js, Express, Django, FastAPI, Flask, Rails), major libraries that define the architecture (React, Vue, Svelte, Tailwind CSS, Prisma), databases (PostgreSQL, MongoDB, Redis, MySQL, SQLite), infra/deploy targets explicitly named (Docker, Vercel, AWS), and package managers if the summary emphasizes them.
- **Skip by default**: linters, formatters, test runners, type-only packages, and generic utility libraries (`lodash`, `dotenv`, `eslint`, `prettier`) unless the user has asked for a fully exhaustive badge set. These clutter the badge row without communicating the stack.
- **Ask if ambiguous**: if the summary is thin (e.g. only a one-line README with no package.json contents), don't guess at a stack — state what little you found and ask the user whether to proceed with just that, rather than inventing technologies.

Order the final list intentionally, not alphabetically: language/runtime → frontend framework → backend framework → styling → database → ORM/data layer → infra/deploy. This makes the badge row read like an architecture summary at a glance.

### 3. Resolve version numbers

- If the summary gives a version (`^16.0.0`, `~5.2`), strip range operators (`^`, `~`, `>=`) and normalize to `vX.Y` (e.g. `^16.0.0` → `v16.0`). Use `vMAJOR.MINOR`, dropping patch unless the user wants full precision.
- If no version is present in the summary, **do not invent one**. Omit the version segment from the badge entirely rather than guessing — use just the technology name as the message, e.g. `Redis-DC382D?logo=redis&logoColor=white` with no version segment, or fall back to a static label-only badge. Never fabricate a version number that wasn't in the source data.

### 4. Map each technology to shields.io parameters

For each included technology, resolve three things: the **logo slug** (simple-icons name), the **brand color** (hex, no `#`), and whether the logo needs `logoColor=white` for contrast on a dark badge.

Use this reference table as the primary lookup. If a technology isn't listed, search simple-icons' naming convention (lowercase, no spaces, e.g. `Next.js` → `nextdotjs`, `C++` → `cplusplus`) and use the project's real brand color — don't default everything to gray.

| Technology    | logo slug   | color (hex) | logoColor |
| ------------- | ----------- | ----------- | --------- |
| Next.js       | nextdotjs   | 000000      | white     |
| React         | react       | 61DAFB      | black     |
| Vue.js        | vuedotjs    | 4FC08D      | white     |
| Svelte        | svelte      | FF3E00      | white     |
| Angular       | angular     | DD0031      | white     |
| Nuxt          | nuxtdotjs   | 00DC82      | white     |
| Node.js       | nodedotjs   | 339933      | white     |
| TypeScript    | typescript  | 3178C6      | white     |
| JavaScript    | javascript  | F7DF1E      | black     |
| Python        | python      | 3776AB      | white     |
| Django        | django      | 092E20      | white     |
| Flask         | flask       | 000000      | white     |
| FastAPI       | fastapi     | 009688      | white     |
| Express       | express     | 000000      | white     |
| Ruby on Rails | rubyonrails | CC0000      | white     |
| Go            | go          | 00ADD8      | white     |
| Rust          | rust        | 000000      | white     |
| Tailwind CSS  | tailwindcss | 06B6D4      | white     |
| Bootstrap     | bootstrap   | 7952B3      | white     |
| PostgreSQL    | postgresql  | 4169E1      | white     |
| MySQL         | mysql       | 4479A1      | white     |
| MongoDB       | mongodb     | 47A248      | white     |
| Redis         | redis       | DC382D      | white     |
| SQLite        | sqlite      | 003B57      | white     |
| Prisma        | prisma      | 2D3748      | white     |
| GraphQL       | graphql     | E10098      | white     |
| Docker        | docker      | 2496ED      | white     |
| Kubernetes    | kubernetes  | 326CE5      | white     |
| Vercel        | vercel      | 000000      | white     |
| AWS           | amazonaws   | 232F3E      | white     |
| Firebase      | firebase    | FFCA28      | black     |
| Vite          | vite        | 646CFF      | white     |
| Webpack       | webpack     | 8DD6F9      | black     |

### 5. Build the badge URL and Markdown

Use the shields.io static badge endpoint. General form:

```
https://img.shields.io/badge/<LABEL>-<MESSAGE>-<COLOR>?logo=<LOGO>&logoColor=<LOGOCOLOR>&color=<COLOR>
```

Rules for constructing `<LABEL>` and `<MESSAGE>`:

- Replace spaces in the label with `_` or `%20` (dashes inside the label itself, like "Next.js", stay as-is — only literal spaces need escaping).
- The literal `-` character separates label / message / color segments, so any `-` that's part of the technology name itself must be escaped as `--`.
- If there's no version, drop the message segment and just use `<LABEL>-<COLOR>`.

Wrap each URL in Markdown image syntax:

```
![Static Badge](https://img.shields.io/badge/Next.js-v16.0-000000?logo=nextdotjs&logoColor=white&color=000000)
```

Emit one badge per line (not inline in a paragraph) so they render as a clean row and are easy to diff/reorder later.

### 6. Write the output file

Produce a single Markdown file, e.g. `stack-badges.md`, containing:

```markdown
<!-- Tech stack badges — generated from project summary -->

![Static Badge](https://img.shields.io/badge/...)
![Static Badge](https://img.shields.io/badge/...)
...
```

Nothing else goes in this file — no headers, no prose — so it can be copy-pasted directly into a README's badge row. If the user wants it embedded into an existing README rather than as a standalone file, insert the same block at the top of the readme file.

## Edge cases

- **Monorepo with multiple stacks** (e.g. separate `frontend`/`backend` package.json blocks in the summary): keep one unified badge row, but preserve the frontend → backend → data ordering from step 2 so the split is still legible.
- **Conflicting versions** for the same technology mentioned in different parts of the summary: prefer the value that looks like it came from `package.json` (structured) over a prose mention (unstructured).
- **Technology named only in prose, never in dependencies** (e.g. "hosted on Vercel"): still include it — infra/deploy targets are rarely dependencies but are still valid stack signals.
- **Nothing usable found**: don't fabricate a stack. Report that the summary didn't contain enough signal and ask whether to proceed with partial results or skip badge generation.
