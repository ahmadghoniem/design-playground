Stack: React 19 + Vite + Hono, TypeScript. The `@/` alias now exists (maps to package root). Imports are still relative today.

TASK: Convert EVERY relative import in client code to a `@/`-absolute import. This is a pure mechanical codemod — no files move, no logic changes. Doing this now makes later file moves trivial (only a path prefix changes, never the depth).

SCOPE: All `.ts`/`.tsx` files under `app/`, `components/`, `hooks/`, `lib/`, `nodes/`, `stores/`, `prompts/`, and the root-level entry files (`dev-entry.tsx`, `registry.tsx`, `page.tsx` if at root).

PLUS a narrow exception in `server/`: server files import ~9 CLIENT modules by relative path
(e.g. `../../lib/constants`, `../../lib/providers`, `../../lib/design-md-helpers`,
`../../lib/run-design-md-cli`, `../../lib/parse-design-md`, `../../lib/props-fetchers.server`,
`../../lib/resolve-playground-dir`, `../../lib/sync-host-gitignore`, `../../prompts/discovery.prompt`,
`../../prompts/discovery-analyze.prompt`). Convert ONLY those cross-boundary specifiers (any
server import whose relative path climbs OUT of `server/` into a client dir — `../../lib/*`,
`../../prompts/*`, etc.) to `@/`-absolute. This lets those client files move later without
breaking server.

DO NOT TOUCH in server: any import that stays WITHIN server (`./index`, `./lib/x`, `./routes/x`,
`../lib/x` that resolves inside server/) — those keep their relative paths. Also never touch
`node_modules/` or non-source files.

HOW:
- For each in-scope file, rewrite every import/export specifier that starts with `./` or `../` and resolves to a project file into the equivalent `@/`-absolute path.
  Example: in `app/PlaygroundCanvas.tsx`, `import { X } from "../lib/constants"` → `import { X } from "@/lib/constants"`.
  Example: in `nodes/shared/IterateDialog.tsx`, `import { Y } from "../../lib/draw-types"` → `import { Y } from "@/lib/draw-types"`.
- Compute the absolute path by resolving the relative specifier against the importing file's directory, then expressing it from the package root as `@/<path-without-extension>`.
- Preserve `import type`, default vs named, side-effect imports (`import "./x.css"` → `import "@/styles/x.css"` if it points to a project file), and re-exports (`export { z } from "./z"`).
- Leave bare/package imports (`react`, `@xyflow/react`, `zustand`, `lucide-react`, etc.) exactly as-is.
- Leave CSS/asset imports that resolve to project files converted too (they still resolve via the same alias).
- Do NOT reformat or reorder imports otherwise; change only the specifier string.

CONSTRAINTS:
- No file is moved, renamed, created, or deleted. Only import specifier strings change.
- No behavioral/JSX/logic change whatsoever.
- `server/` is untouched.
- Do it directory by directory to stay systematic; after each directory, spot-check a couple of files.

VERIFY:
- `grep -rnE "from ['\"]\.\.?/" --include=*.ts --include=*.tsx app components hooks lib nodes stores prompts` returns NO matches (zero remaining relative imports in client dirs). If a stray CSS/asset relative import must remain because it points outside the alias root, list it explicitly in the report.
- `grep -rn "from ['\"]@/" --include=*.ts --include=*.tsx app | head` shows converted absolute imports.
- `grep -rnE "from ['\"]\.\./\.\./(lib|prompts|hooks|nodes|components|stores|app)/" --include=*.ts server` → NO matches (all server→client relative imports converted to `@/`).
- `grep -rnE "from ['\"]\./" --include=*.ts server | head` still shows server's WITHIN-server relative imports unchanged.
