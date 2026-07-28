# Design Playground

> Drag components onto a canvas and generate AI-powered layout and style variations — right inside your React + Vite project.

_Originally forked from [B1u3B01t/design-playground](https://github.com/B1u3B01t/design-playground)._

## Quick Start

```bash
# 1. Run the setup script (requires Bun — https://bun.sh)
node src/app/playground/setup.mjs

# 2. Start your dev server
bun dev

# 3. Open the playground
# Visit http://localhost:5173/playground   (or whatever port Vite reports)
```

## Requirements

- **Bun** (https://bun.sh) — used to install the playground's nested dependencies
- **Vite 5, 6, or 7** (the playground API mounts into the dev server via a Vite plugin)
- **React 18 or 19**
- **Tailwind CSS v4**
- **Node.js 18+**
- **Claude Code CLI** on your PATH (see [Provider](#provider) below)

This is a **local-dev-only** tool. It is never built into CI or production — it runs only in your dev server.

## What Gets Installed

The playground lives entirely in `app/playground/` — no global config changes, no wrappers. To uninstall, just delete that folder: its dependencies live nested inside it and are removed with it. Your `package.json` is never touched.

The setup script checks your project and installs the playground's dependencies with **Bun**, **nested** under `app/playground/node_modules/` (so your host `package.json` and lockfile stay clean). It also **configures `.gitignore`** so the playground and generated artifacts (iterations, temp files) are not committed. Run `node src/app/playground/setup.mjs --untrack` if playground files were already tracked. See [SETUP.md](SETUP.md) for details.

---

## How It Works

1. **Open** the playground — your components are already listed in the sidebar
2. **Drag** one onto the infinite canvas
3. **Describe** what you want in the chat bar at the bottom
4. **Compare** the generated variations side-by-side
5. **Adopt** the one you like — it overwrites the original component file

Everything happens locally. Your code stays on your machine.

---

## Provider

**Claude Code** is the only AI provider. Install the CLI and keep it on your PATH.

```bash
bun add -g @anthropic-ai/claude-code
```

Two options are configurable in Model Settings:

| Option       | Description                              | Default  |
| ------------ | ---------------------------------------- | -------- |
| Effort Level | How thoroughly the AI explores solutions (Low / Med / High / Max) | High |
| Budget Limit | Maximum spend per generation (USD)       | No limit |

---

## Canvas Basics

- **Pan** — Click and drag on empty space, or use the scroll wheel
- **Zoom** — Pinch or Ctrl/Cmd + scroll, or the zoom controls at bottom-left
- **Undo / Redo** — `Ctrl/Cmd + Z` and `Ctrl/Cmd + Shift + Z` (or `Y`), or the buttons beside the zoom controls
- **Snap to guides** — Hold `Ctrl/Cmd` while dragging
- **Select** — Click a component card
- **Multi-select** — Shift + click, or drag a selection box
- **Delete** — Select a card and press Backspace/Delete
- **Interact with a preview** — Double-click to enter interact mode (previews are click-shielded by default so canvas dragging works)
- **Select an element inside a preview** — Hold `Alt` and hover/click. The selection is passed to the AI as context.

### Component Cards

Each card on the canvas shows a live preview rendered inline — not in an iframe. Cards display the component, its iteration number, a viewport switcher (Auto / Desktop / Mobile), and actions to copy the code or adopt the variation.

---

## Generating Variations

Everything runs through the docked chat bar at the bottom of the canvas. It has three modes:

| Mode        | What it does                                                              |
| ----------- | ------------------------------------------------------------------------- |
| **Explore** | Generates 1–4 new variation files alongside the original. Drag the counter to set how many. |
| **Edit**    | Modifies the targeted file in place — no new iterations                    |
| **Raw**     | Sends your prompt through untouched, without the built-in scaffolding      |

Drop a component or iteration onto the chat bar (or select it first) to target it. With no target, the prompt is freeform and produces a standalone result.

- **Shift + Tab** — Cycle through available models
- **Enter** — Send
- **Shift + Enter** — New line
- **`/`** — Insert a skill (see below)

---

## Component Discovery

Discovery is **deterministic static analysis** — no AI agent, no scanning delay. On load, the playground walks your app's render tree starting from your entry point (`createRoot(...).render(...)`), resolves import specifiers against your `tsconfig` paths, and lists what it finds. Everything discovered is immediately draggable; there is no "add" step.

It also reads your `components/ui/` directory for primitives and parses theme tokens out of your CSS entry.

> **Note:** overlay components (Dialog, Sheet, Popover, DropdownMenu…) are listed but never mounted live. They portal to `document.body` and would escape the canvas card to cover the whole viewport.

---

## Skills

Skills are prompt templates you attach to a generation by typing `/` in the chat bar. Built-in:

| Skill                         | What It Does                                                        |
| ----------------------------- | ------------------------------------------------------------------- |
| **design-variations**         | Generates multiple distinct visual directions of a component or page |
| **frontend-design**           | Guidance for distinctive, intentional visual design                  |
| **make-interfaces-feel-better** | Polish pass — animation, hover states, shadows, optical alignment  |
| **stick-to-design-system**    | Constrains output to Tailwind classes already used in your codebase  |
| **ux-variation-designer**     | Structural and interaction variations, not just cosmetic ones        |
| **nothing-design**            | Applies the Nothing design system (only when asked for by name)      |

You can add your own from the skills catalog.

---

## Model Settings

Open **Model Settings** from the toolbar gear icon to:

- Enable or disable specific Claude models
- Set the effort level and budget limit
- Refresh the available model list

Your preferences are saved in your browser and persist across sessions.

---

## Project Structure

```
app/playground/
├── app/               # Composition shell (PlaygroundClient/Canvas/Header/Sidebar)
├── features/          # One dir per feature: canvas, registry-sidebar, iterations,
│                      #   generation, chat, skills
├── shared/            # ui/ (primitives), lib/ (cross-feature helpers), stores/
├── server/            # Hono API (mounted into Vite via server/vite-plugin.ts)
├── skills/            # Built-in prompt templates
├── iterations/        # Generated variation files
├── dev-entry.tsx      # createRoot mount entry
├── registry.tsx       # Component registry (fed by discovery)
└── setup.mjs          # Setup script
```

Client code is feature-based; cross-feature imports use the `@pg/` alias. See `CLAUDE.md` for the full layout and boundary rules.

---

## Troubleshooting

**"Provider not found" error**
Make sure the Claude Code CLI is installed and available in your terminal's PATH. Run `claude --version` to verify.

**Models not loading**
Click the refresh button in Model Settings.

**Generation seems stuck**
Check your terminal for the agent's output. You can cancel an in-progress generation from the canvas toolbar.

**Sidebar is empty**
Discovery walks outward from your app's entry point. If it can't find `createRoot`, or your components aren't reachable from it, nothing is listed. Check the dev-server console for `[Playground][discover]` output.

**A dialog opened by itself and covered the canvas**
An overlay component made it into the registry. Those portal outside their card by design — remove it from `discovered-registry.json`.
