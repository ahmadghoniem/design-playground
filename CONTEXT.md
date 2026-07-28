# Domain context — design-playground

Local-dev design canvas embedded in a host React app. Agents generate layout/style **iterations** of host **registry** components onto an infinite canvas.

## Glossary

**Playground root** — The host-relative directory where this package lives (`src/app/playground` or `app/playground`). Resolved on disk by sentinels (`PlaygroundClient.tsx`, `registry.tsx`).

**PlaygroundPaths** — Module that builds host-relative POSIX paths under the playground root for prompts, edit targets, and agent instructions (e.g. iteration files, `tree.json`). Callers do not hardcode the root or subdirectory folklore.

**Relative root (client)** — Playground-root string baked into the client bundle by the Vite plugin (`define`) and cached once at boot, so browser-built prompts use the real layout without a post-hoc rewrite. No HTTP is involved.

**Iteration** — A generated variant file under `iterations/`, listed in `tree.json` (`index.ts` is rebuilt server-side).

**Generation** — One agent run that writes one or more iterations (or edits) from a prompt.

**Registry** — The list of host components available to drag and to generate from. Fed entirely by static discovery; `registry.tsx` holds no hardcoded entries and owns neither path nor prompt policy.
