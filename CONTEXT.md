# Domain context — design-playground

Local-dev design canvas embedded in a host React app. Agents generate layout/style **iterations** of host **registry** components onto an infinite canvas.

## Glossary

**Playground root** — The host-relative directory where this package lives (`src/app/playground` or `app/playground`). Resolved on disk by sentinels (`PlaygroundClient.tsx`, `registry.tsx`).

**PlaygroundPaths** — Module that builds host-relative POSIX paths under the playground root for prompts, edit targets, and agent instructions (e.g. iteration files, `tree.json`). Callers do not hardcode the root or subdirectory folklore.

**Relative root (client)** — Cached playground-root string fetched once from the server so browser-built prompts use the real layout without a post-hoc rewrite.

**Iteration** — A generated variant file under `iterations/`, registered in `index.ts` and `tree.json`.

**Generation** — One agent run that writes one or more iterations (or edits) from a prompt.

**Registry** — Host component tree registered for discovery and as generation sources (not the place that owns path or prompt policy).
