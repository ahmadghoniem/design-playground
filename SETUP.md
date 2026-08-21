# Playground Setup

Four steps, all by hand. There is no setup script — every step below is a command you
run or a block you paste, and keeping it that way is deliberate: the script that used to
wrap this was more code to maintain than the steps it replaced.

## 1. Drop in the folder

Copy `playground/` into your React + Vite project at `src/app/playground/` (or
`app/playground/` — both are recognised).

## 2. Register the dev-server plugin

```ts
// vite.config.ts
import { designPlaygroundPlugin } from './src/app/playground/server/vite-plugin';

export default defineConfig({ plugins: [react(), designPlaygroundPlugin()] });
```

## 3. Install the dependencies, nested

From **inside** the playground folder:

```
cd src/app/playground
bun install
```

Run it from that directory. A bare `bun install` there reads this folder's own
`package.json` and `bunfig.toml`; your host `package.json` and lockfile are never touched,
and everything lands in `src/app/playground/node_modules/`.

`bunfig.toml` sets `[install] peer = false`. That is what keeps React, `react-dom`,
`tailwindcss`, and `vite` **out** of the nested `node_modules` so they resolve up to your
app's single copy — without it you get "invalid hook call". Don't remove it.

## 4. Add the ignore block

Paste into your host `.gitignore`:

```gitignore
# Design Playground — local dev tool
/src/app/playground/
/app/playground/
/.playground-temp/
/skills-lock.json
/.claude/skills/
/public/untitled-*/
```

If you had already committed playground files, stop tracking them (they stay on disk):

```
git rm -r --cached --ignore-unmatch src/app/playground app/playground .playground-temp skills-lock.json .claude/skills
```

Then start your dev server (`bun dev`) and open `http://localhost:5173/playground`.

## Prerequisites

Bun (https://bun.sh), plus these already in your project:

- **Vite** 5 or 6 — the playground API mounts into the dev server via `server/vite-plugin.ts`
- **React** 18 or 19
- **Tailwind CSS** v4

The playground UI is **self-contained** — it ships its own neutral theme (a private `--pg-*`
token namespace) and needs no colour setup. Your own components, rendered on the canvas,
inherit **your app's** theme tokens automatically: if your project uses
[shadcn/ui](https://ui.shadcn.com)-style tokens (`--background`, `--primary`, `--muted`, …)
previews match your app exactly; if not, previews use whatever colours your components specify.

## AI generation

Variation generation runs the **Claude Code** CLI as a subprocess, so it needs to be on your
PATH:

```
bun add -g @anthropic-ai/claude-code
```

Everything else works without it — you just can't generate variations from the UI.

## How it works

1. **Drag** components from the flank onto the canvas
2. **Generate variations** with the sparkle icon on any component
3. **Compare** variations side-by-side
4. **Use a variation** — "Use this" copies the import path
5. **Delete** variations you don't want; the files go with them

## Git

Your host `package.json` and lockfile stay untouched — the playground produces **no
dependency diff** for your project to commit.

**Create Page routes** (`src/app/{slug}/page.tsx`, created from the playground) are host-app
pages and stay tracked unless you ignore them yourself.

## Removing the playground

Delete `src/app/playground/`. Its nested `node_modules/` goes with it — there is nothing to
uninstall, because nothing was ever added to your `package.json`.
