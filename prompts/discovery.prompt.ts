/**
 * Prompt template for AI-powered repository scanning.
 * The agent uses this to discover visual components and pages worth showcasing
 * in the playground. Written to be cheap/fast: classify from paths + cheap greps,
 * reading a file in full only when its type is genuinely ambiguous.
 */

interface DiscoveryPromptParams {
  playgroundDir: string;
  existingEntryIds?: string[];
}

export function discoveryPrompt({ playgroundDir, existingEntryIds }: DiscoveryPromptParams): string {
  const preserveClause = existingEntryIds?.length
    ? `\n## Preserve existing entries\nThese entry IDs already have status "added" in discovery.json — keep them byte-for-byte (do not touch their status/analysis). Only add/update entries with status "discovered".\nPreserve IDs: ${existingEntryIds.join(', ')}\n`
    : '';

  return `You are scanning a React + Vite project to discover visual UI components and pages to showcase in a design playground. The host may follow a per-route \`page.tsx\` convention (mirroring this playground's own \`page.tsx\`/\`layout.tsx\` pattern) OR be a plain Vite/React app with a single root \`App.tsx\` and no per-route files. Detect which convention applies and adapt.

Goal: write \`${playgroundDir}/discovery.json\`. Optimize for **speed and low token use** — do NOT read every file in full, and do NOT make a second validation pass that re-reads files. Be decisive.

## Step 1 — List candidate files (one command)

\`\`\`bash
rg --files -g '*.tsx' -g '!node_modules' -g '!${playgroundDir}/**' -g '!**/*.test.tsx' -g '!**/*.stories.tsx'
\`\`\`

This is your candidate set. Work from it directly.

## Step 2 — Classify cheaply (avoid full reads)

For each candidate, decide INCLUDE/SKIP using the path and filename first. Only open a file (and only its first ~40 lines, e.g. \`rg -n 'export default|return \\(|<[A-Z]|className' <file> | head\`) when the path alone is ambiguous.

INCLUDE:
- Per-route convention: every \`page.tsx\` (any route — auth/admin/legal/utility pages all count) → type \`"page"\`.
- Single-entry convention: the root \`App.tsx\` → type \`"component"\` (no route).
- Any \`.tsx\` that exports a component rendering real visual JSX — cards, banners, modals, navbars, footers, badges, charts, tables, forms, sections, toolbars, shadcn primitives in \`components/ui/\` (button, card, dialog, etc.). A component still counts even if it also appears as another entry's child.

SKIP (no need to open — decide by path/name):
- Anything inside \`${playgroundDir}/\`.
- API routes (\`**/api/**\`, \`route.ts(x)\`).
- Route-scaffolding files: \`layout.tsx\` and other non-visual route wrapper/boundary files (e.g. loading, error, not-found boundaries) — these wrap page content, they aren't page content themselves.
- Non-visual: hooks (\`use-*\`), utils, contexts, stores, types, constants, middleware, \`*.test.tsx\`, \`*.stories.tsx\`.
- Pure wrappers whose JSX is only \`{children}\`, pure providers/script-loaders (e.g. \`*Provider\`, analytics), pure re-export barrels, and files under ~10 lines.

When unsure, INCLUDE — coverage beats curation, the user prunes later.

## Step 3 — Fill each entry

- \`id\`: unique kebab-case slug.
- \`name\`: Title Case With Spaces. Pages: mechanical from the route (drop leading \`/\`, replace dynamic segments \`[slug]\`→\`Detail\`, title-case segments, join with spaces; \`/\`→\`Home\`). Components: from the filename (\`HeroSection.tsx\`→\`"Hero Section"\`). No editorializing/rebranding.
- \`path\`: repo-relative path to the file.
- \`type\`: \`"page"\` (only \`page.tsx\`) or \`"component"\` (everything else).
- \`route\`: pages only — the URL path starting \`/\`. Omit for components.
- \`description\`: ONE sentence on what's on screen (color, layout, imagery, motion). Never name libraries, hooks, providers, frameworks, or rendering strategy.
- \`status\`: always \`"discovered"\`.
- \`childComponents\`: best-effort, ZERO extra cost — only from import lines you already saw while open. Each is \`{ "name": "<PascalCaseImportIdentifier>", "path": "<relative/path.tsx>" }\`, in-project visual children only. If you did not open the file, use \`[]\`. Any child you list must also exist as its own top-level entry.
${preserveClause}
## Step 4 — Quick sanity check (no file re-reads)

Confirm without re-opening files: \`version\` is integer \`1\`; \`scannedAt\` is ISO 8601; each entry has \`id,name,path,type,description,status,childComponents\`; \`type\` is \`"page"|"component"\`; pages have \`route\`, components do not; ids are unique kebab-case; \`status\` is \`"discovered"\`. Fix any structural slip in place.

## Output — write exactly this shape to \`${playgroundDir}/discovery.json\`

\`\`\`json
{
  "version": 1,
  "scannedAt": "<ISO 8601>",
  "entries": [
    { "id": "home", "name": "Home", "path": "src/app/page.tsx", "type": "page", "route": "/", "description": "<one sentence>", "status": "discovered", "childComponents": [ { "name": "Hero", "path": "src/app/ui/Hero.tsx" } ] },
    { "id": "hero", "name": "Hero", "path": "src/app/ui/Hero.tsx", "type": "component", "description": "<one sentence>", "status": "discovered", "childComponents": [] }
  ]
}
\`\`\`

Only modify \`${playgroundDir}/discovery.json\`. Do not touch any other file.
`;
}
