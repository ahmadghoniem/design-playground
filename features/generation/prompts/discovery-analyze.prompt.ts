/**
 * Prompt template for per-component AI analysis.
 * The coding agent uses this to add a component to the playground registry
 * with inline props — no mock-data files.
 */

interface DiscoveryAnalyzeParams {
  id: string;
  name: string;
  componentPath: string;
  playgroundDir: string;
  /** If this is a child component, the parent's registry ID. */
  parentId?: string;
}

export function discoveryAnalyzePrompt({
  id,
  name,
  componentPath,
  playgroundDir,
  parentId,
}: DiscoveryAnalyzeParams): string {
  const componentInstructions = `This is a standalone component. Register it directly using its actual import path.

If it uses server-only or environment-only features, find the underlying presentational component and register that instead.`;

  return `You are adding a component to the design playground. Follow each step exactly.

## Component to register

- **Name**: ${name}
- **Path**: ${componentPath}

## Step 1: Determine what to register

${componentInstructions}

## Step 2: Add an entry to the discovered-registry manifest

You do NOT edit \`registry.tsx\`. Instead, add a data entry to the
playground-owned manifest at \`${playgroundDir}/discovered-registry.json\`. The
playground regenerates the real registry module from this manifest — writing
data is safe and can never break the registry with a syntax slip.

First, determine the **registry ID** for this component:
- The registry \`id\` MUST be the PascalCase name of the React component you are registering, converted to kebab-case.
  - Examples: \`Team\` → \`team\`, \`ArticleCard\` → \`article-card\`, \`InsightsClient\` → \`insights-client\`
- Do NOT use the discovery entry ID (\`${id}\`) unless it already matches the component name in kebab-case.

Read \`${playgroundDir}/discovered-registry.json\` (it always exists; it looks
like \`{ "version": 1, "entries": [] }\` when empty). Then **upsert** an entry
into \`entries\` — if an entry with the same \`"discoveryId"\` already exists,
replace it in place; otherwise append. Keep all other entries byte-for-byte.

Each entry has exactly this shape:

\`\`\`json
{
  "discoveryId": "${id}",
  "id": "<kebab-case component name — e.g. team, article-card, insights-client>",
  "label": "${name}",
  "componentName": "<PascalCase React component identifier as exported, e.g. Team, ArticleCard>",
  "importPath": "<import specifier for the component, e.g. @/features/team/Team>",
  "exportKind": "<default | named — how the component is exported from importPath>",
  "sourcePath": "<repo-relative path to the actual component file being registered>",
  "size": "<default | laptop | tablet | mobile>",
  "props": { "/* inline prop values */": "…" }${parentId ? `,\n  "parentId": "${parentId}"` : ''}
}
\`\`\`

**Field rules (critical):**
- \`discoveryId\` MUST be exactly \`${id}\` — this is how the playground links the manifest entry back to the discovery scan and how removal finds it.
- \`id\` MUST be the component name in kebab-case, not the discovery entry ID. The iteration system uses this ID to link generated variants back to the registry.
- \`componentName\` + \`importPath\` + \`exportKind\` MUST let \`import { <componentName> } from "<importPath>"\` (named) or \`import <componentName> from "<importPath>"\` (default) resolve to the component. Use the \`@/\` alias (maps to \`src/\`) — the same convention the host uses.
- \`props\` MUST be realistic (real names, plausible copy — NOT "Lorem ipsum" or "test123") and **pure JSON-serialisable data only** — no functions, no \`new Date(...)\`, no JSX. Use ISO strings for dates. This object is embedded verbatim into the generated module.

Size guidelines:
- \`laptop\` — full-page layouts, dashboards, landing pages
- \`default\` — cards, sections, small/medium components
- \`tablet\` / \`mobile\` — only if the component targets that specific viewport

**Background colour (important):** Some components may have no explicit background — they inherit \`bg-background\` from the \`<body>\`. In the playground the component is rendered inside a wrapper, NOT a \`<body>\`, so that inheritance is lost. If the component or any of its children rely on the page background colour (e.g. the outermost \`<div>\` has no \`bg-*\` class), add a \`className: "bg-background"\` prop value so the correct theme colour is resolved via CSS variables. Do NOT use a hardcoded \`bg-white\`.

## That's it — do NOT edit discovery.json

Do NOT touch \`${playgroundDir}/discovery.json\` — the playground updates the
entry's status and analysis itself, and regenerates the registry module, once
you have written the manifest entry. Just make sure your
\`discovered-registry.json\` entry is correct and complete.

## Rules

- Do NOT modify the original component at \`${componentPath}\`
- Do NOT edit \`${playgroundDir}/registry.tsx\` — it is hand-written; discovered components go in the manifest only
- Do NOT edit \`${playgroundDir}/discovery.json\` — the playground maintains it
- Do NOT create any wrapper or \`discovered/\` files — there is no \`discovered/\` directory
- Do NOT create a \`data/\` directory or any \`*.mockData.ts\` file — props are always inline object literals in the manifest entry
- Only touch: \`${playgroundDir}/discovered-registry.json\`
- All import paths must be correct relative to the project root (\`@/\` alias maps to \`src/\`)
- Inline props must look visually appealing and realistic when rendered
`;
}
