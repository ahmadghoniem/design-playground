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
  /** Real data fetched from the app's data source. Use verbatim for mock props. */
  propsSnapshot?: Record<string, unknown>;
  /** If this is a child component, the parent's registry ID. */
  parentId?: string;
}

export function discoveryAnalyzePrompt({
  id,
  name,
  componentPath,
  playgroundDir,
  propsSnapshot,
  parentId,
}: DiscoveryAnalyzeParams): string {
  const componentInstructions = `This is a standalone component. Register it directly using its actual import path.

If it uses server-only or environment-only features, find the underlying presentational component and register that instead.`;

  const snapshotSection = propsSnapshot
    ? `## Real data snapshot — use this for inline props

The following is live data fetched directly from this app's data source.
**Use these exact values** when writing the inline \`props\` object. Do NOT copy any fetch logic — just inline the data as constants.

\`\`\`json
${JSON.stringify(propsSnapshot, null, 2)}
\`\`\`

`
    : '';

  return `You are adding a component to the design playground. Follow each step exactly.

## Component to register

- **Name**: ${name}
- **Path**: ${componentPath}

## Step 1: Determine what to register

${componentInstructions}

${snapshotSection}## Step 2: Add an entry to registry.tsx

Open \`${playgroundDir}/registry.tsx\` and make two edits.

First, determine the **registry ID** and **component import** for this component:
- The registry \`id\` MUST be the PascalCase name of the React component you are registering, converted to kebab-case.
  - Examples: \`Team\` → \`team\`, \`ArticleCard\` → \`article-card\`, \`InsightsClient\` → \`insights-client\`
- Do NOT use the discovery entry ID (\`${id}\`) unless it already matches the component name in kebab-case.

Add a static import for the component itself (alongside the other component imports near the top of the file):

\`\`\`ts
// for a default-exported component:
import <ComponentName> from '<correct import path>';

// for a named-exported component:
import { <ComponentName> } from '<correct import path>';
\`\`\`

Then add the entry inside the \`pages\` group's \`children\` array:

\`\`\`ts
{
  id: '<kebab-case component name — e.g. team, article-card, insights-client>',
  label: '${name}',
  Component: <ComponentName> as unknown as ComponentType<Record<string, unknown>>,
  props: { /* inline prop values */ } as Record<string, unknown>,
  sourcePath: '<path to the actual component file being registered>',
  size: '<one of: default | laptop | tablet | mobile>',
  propsInterface: \`<the component's TypeScript props interface as a string>\`,${parentId ? `\n  parentId: '${parentId}',` : ''}
},
\`\`\`

**Props rule (critical):** The \`props\` field MUST be a literal inline object with realistic values — NOT a reference to an external mock-data import. All values must be realistic (real names, plausible copy — NOT "Lorem ipsum" or "test123"). Pure serialisable data only.

**Syntax rule (critical):** After inserting your entry, the \`children\` array MUST stay valid TypeScript — every entry comma-separated. Your new entry needs a trailing comma, and the entry directly before it must still end with one. Re-read the array around your insertion and confirm there is nowhere a \`}\` is immediately followed by \`{\` without a comma between them (that is a syntax error that breaks the whole registry).

**ID rule (critical):** The \`id\` must match the component name in kebab-case, not the discovery entry ID (\`${id}\`). The iteration system uses this ID to link generated variants back to the registry.

Size guidelines:
- \`laptop\` — full-page layouts, dashboards, landing pages
- \`default\` — cards, sections, small/medium components
- \`tablet\` / \`mobile\` — only if the component targets that specific viewport

**Background colour (important):** Some components may have no explicit background — they inherit \`bg-background\` from the \`<body>\`. In the playground the component is rendered inside a wrapper, NOT a \`<body>\`, so that inheritance is lost. If the component or any of its children rely on the page background colour (e.g. the outermost \`<div>\` has no \`bg-*\` class), add \`className="bg-background"\` to the component's root element in the inline props or note that the playground wrapper already applies \`bg-background\`. Do NOT use a hardcoded \`bg-white\` — always use \`bg-background\` so the correct theme colour is resolved via CSS variables.

## Step 3: Add a props fetcher (if the component uses real data)

Open \`${playgroundDir}/lib/props-fetchers.server.ts\`.

Examine the component at \`${componentPath}\` and its data-fetching logic (look at fetch/async calls, server actions, database queries, or API calls it delegates to):

- **If the component fetches real data** (from a database, API, CMS, etc.), add an async fetcher entry to the \`propsFetchers\` map. The key must be the same **kebab-case registry ID** you used in Step 2 (e.g. \`'article-card'\`, \`'team'\`).
  - Mirror the real data-fetching logic from the source component — same imports, same client, same query.
  - Return the data shaped exactly like the props the component expects (same structure as the inline props you wrote in Step 2).
  - Keep the snapshot small: use \`.limit()\`, \`.slice()\`, or similar to cap lists to 5–10 items.
  - Only import what the host app already has (e.g. its existing DB client, fetch helpers, etc.). Do NOT add new dependencies.
  - Add any required imports at the top of the file (alongside existing imports).

- **If the component is purely static** (no data fetching — it only uses props, hardcoded values, or context), skip this step entirely.

Example entry shape:

\`\`\`ts
'registry-id': async () => {
  const data = await fetchSomething();
  return { propA: data.x, propB: data.y };
},
\`\`\`

## Step 4: Update discovery.json

Read \`${playgroundDir}/discovery.json\` and update the entry with id \`${id}\`:

1. Set \`"status"\` to \`"added"\`
2. Add an \`"analysis"\` object:

\`\`\`json
{
  "analysis": {
    "showcasePath": "<path to the component file being registered>",
    "componentName": "<PascalCase React component name, e.g. Team, ArticleCard, InsightsClient>",
    "registryId": "<same kebab-case id used in registry.tsx, e.g. team, article-card, insights-client>",
    "propsInterface": "<TypeScript props interface as a string>",
    "size": "<default | laptop | tablet | mobile>"
  }
}
\`\`\`

**Important:** Do NOT modify the \`parentId\` field if it already exists on this entry — it was set automatically by the system.

## Rules

- Do NOT modify the original component at \`${componentPath}\`
- Do NOT create any wrapper or \`discovered/\` files — there is no \`discovered/\` directory
- Do NOT create a \`data/\` directory or any \`*.mockData.ts\` file — props are always inline object literals in registry.tsx
- Only touch: \`${playgroundDir}/registry.tsx\`, \`${playgroundDir}/discovery.json\`, and (if the component fetches data) \`${playgroundDir}/lib/props-fetchers.server.ts\`
- All import paths must be correct relative to the project root (\`@/\` alias maps to \`src/\`)
- Inline props must look visually appealing and realistic when rendered
- The props fetcher key MUST match the kebab-case registry ID exactly — this is how the analyze route links the two
`;
}
