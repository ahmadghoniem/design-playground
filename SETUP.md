# Playground Setup

## Quick Start

1. Copy the `playground/` folder into your React + Vite project's `src/app/` directory
2. Register the dev-server plugin in your `vite.config.ts`:
   ```ts
   import { designPlaygroundPlugin } from './src/app/playground/server/vite-plugin';
   export default defineConfig({ plugins: [react(), designPlaygroundPlugin()] });
   ```
3. Open a terminal in your project root and run the setup script:
   ```
   node src/app/playground/setup.mjs
   ```
4. Start your dev server (`bun dev`)
5. Open `http://localhost:5173/playground` (or whatever port Vite reports)

## Manual Install

If you prefer to skip the script, install the playground's dependencies **nested** with Bun —
from inside the playground folder, so nothing lands in your host `package.json`:

```
cd src/app/playground
bun install
```

A bare `bun install` reads this folder's `package.json` and `bunfig.toml`. The `bunfig.toml`
sets `[install] peer = false`, which keeps React (and the other host-provided peers) out of the
nested `node_modules` so they resolve to your app's single copy (no "invalid hook call").

## Prerequisites

You need Bun installed (https://bun.sh), and your project needs these already installed:

- **Vite** 5 or 6 (the playground API mounts into the dev server via `server/vite-plugin.ts`)
- **React** 18 or 19
- **Tailwind CSS** v4

The playground UI is **self-contained** — it ships its own neutral theme (a private `--pg-*` token namespace) and needs **no color setup**. Your own components, when rendered on the canvas, inherit **your app's** theme tokens automatically (light and dark): if your project uses [shadcn/ui](https://ui.shadcn.com)-style tokens (`--background`, `--primary`, `--muted`, …) in your global stylesheet, previews match your app exactly; if not, previews simply use whatever colors your components specify.

## How It Works

1. **Drag** components from the sidebar onto the canvas
2. **Generate variations** by clicking the sparkle icon on any component (requires the Claude Code CLI — or enable `SHOW_ALL_PROVIDERS` to also use Cursor/Codex)
3. **Compare** variations side-by-side on the canvas
4. **Use a variation** by clicking "Use this" to copy the import path
5. **Delete** variations you don't want — files are removed from your project automatically

## AI Generation

The variation generator runs an agent CLI as a subprocess. **Claude Code is the default and only provider shown** — install it and make sure it's in your PATH:

- **Claude Code** — `bun add -g @anthropic-ai/claude-code`

Cursor and Codex remain implemented but hidden; set `SHOW_ALL_PROVIDERS = true` in `lib/providers/registry.ts` to surface them in the Model Settings dialog (Cursor: [Cursor CLI](https://cursor.com/docs/cli/installation) + `cursor agent login`; Codex: `bun add -g @openai/codex` + `codex login`, runs sandboxed `workspace-write` by default).

The setup script (`node src/app/playground/setup.mjs`) checks for installed providers and will tell you what's missing. Without one, everything else works — you just won't be able to generate new variations from the UI.

## Git

Setup updates your project's `.gitignore` so playground files stay out of version control:

- The full `src/app/playground/` (or `app/playground/`) folder
- Runtime artifacts: `.playground-temp/`, `public/.playground/`, uploaded images
- HTML design frames under `public/{slug}/` (including iterations)
- Skills installed by the playground (`skills-lock.json`, `.claude/skills/`)

**Your host `package.json` and lockfile are untouched.** The playground's dependencies install nested under `src/app/playground/node_modules/` (gitignored), so setup produces no dependency diff for your project to commit.

**Create Page routes** (`src/app/{slug}/page.tsx` created from the playground) are host-app pages and remain tracked unless you ignore them yourself.

If you previously committed playground files, stop tracking them (files stay on disk):

```
node src/app/playground/setup.mjs --untrack
```

New HTML frames are added to `.gitignore` automatically when created or after generation.

## Removing the Playground

Delete the `src/app/playground/` folder. Its nested `node_modules/` (and everything the playground installed) goes with it — there is **nothing to uninstall** from your host project, because the playground never added anything to your `package.json`.
