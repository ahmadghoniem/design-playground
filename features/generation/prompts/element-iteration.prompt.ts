/**
 * @name: element-iteration-prompt
 * @description: Prompt used to generate targeted element iterations — the AI copies the component
 *   verbatim and only modifies the specific elements the user selected via Alt+click.
 */
import { fillTemplate } from '@pg/shared/lib/fill-template';
import { getSequentialIterationRitual } from './shared-sections';
import {
  iterationsGuide,
  iterationsTree,
} from '@pg/shared/lib/playground-paths';

function buildPrompt(): string {
  return `
{{skillSection}}
ELEMENT-TARGETED ITERATION REQUEST
════════════════════════════════════

Component: {{componentName}}
Source: {{sourcePath}}
Iterations requested: {{iterationCount}}
{{childrenSection}}
{{referenceNodesSection}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{elementSelectionsSection}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the source component at the path above
3. **Copy the component file verbatim** into each iteration file
4. **Only modify the targeted elements** described above — everything else must remain pixel-identical
5. Generate {{iterationCount}} variations numbered {{iterationNumbersList}}. ${getSequentialIterationRitual({ parentPlaceholder: '{{componentId}}' })}

Files to create (in this order):
{{iterationSavesBlock}}

IMPORTANT
- Iteration numbers MUST be {{iterationNumbersList}} — do NOT reuse existing iteration numbers
{{customInstructionsSection}}
CRITICAL REQUIREMENTS
- **Copy first, edit second**: Start from an exact copy of the source component. Only then apply changes to the targeted elements.
- **Surgical edits only**: Do NOT redesign the layout, restructure the component, or restyle non-targeted elements.
- **Props interface**: Keep it IDENTICAL to the original component (no added/removed/renamed props, no type changes).
- **Tree manifest**: Update ${iterationsTree()} for each new iteration file.
- Do not edit iterations/index.ts — the server rebuilds it from written iteration files.
- Each iteration must modify the targeted elements differently — they should be visually distinct from each other.

QUALITY CHECKLIST (apply to EACH iteration)
- [ ] Props interface unchanged from original
- [ ] All non-targeted elements are pixel-identical to source
- [ ] Only the targeted elements have been modified
- [ ] All imports resolve correctly with no TypeScript errors
- [ ] Metadata comment included with correct @iteration/@parent
- [ ] File named correctly: {{cleanComponentName}}.iteration-{N}.tsx (filename prefix matches the default export function name)
- [ ] {{stylingQualityItem}}
- [ ] Entry added/updated in iterations/tree.json with correct parent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate all {{iterationCount}} iterations now.`;
}

export interface ElementIterationPromptVars {
  skillSection?: string;
  componentName: string;
  sourcePath: string;
  childrenSection?: string;
  cleanComponentName: string;
  componentId: string;
  customInstructionsSection?: string;
  elementSelectionsSection: string;
  iterationCount: string;
  iterationNumbersList: string;
  iterationSavesBlock: string;
  stylingQualityItem: string;
  referenceNodesSection?: string;
}

export function elementIterationPrompt(vars: ElementIterationPromptVars): string {
  return fillTemplate(buildPrompt(), vars as unknown as Record<string, string>);
}

function buildFromIterationPrompt(): string {
  return `
{{skillSection}}
ELEMENT-TARGETED ITERATION REQUEST (from existing iteration)
══════════════════════════════════════════════════════════════

Component: {{componentName}}
Original source: {{sourcePath}}
Base iteration: {{iterationSourcePath}}
Iterations requested: {{iterationCount}}
{{childrenSection}}
{{referenceNodesSection}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{elementSelectionsSection}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the BASE ITERATION at: {{iterationSourcePath}}
3. Also read the ORIGINAL component for context: {{sourcePath}}
4. **Copy the base iteration file verbatim** into each new iteration file
5. **Only modify the targeted elements** described above — everything else must remain pixel-identical
6. Generate {{iterationCount}} variations numbered {{iterationNumbersList}}. ${getSequentialIterationRitual({
    includeSourceIteration: true,
    parentPlaceholder: '{{treeParent}}',
  })}

Files to create (in this order):
{{iterationSavesBlock}}

IMPORTANT
- Iteration numbers MUST be {{iterationNumbersList}} — do NOT reuse existing iteration numbers
{{customInstructionsSection}}
CRITICAL REQUIREMENTS
- **Copy first, edit second**: Start from an exact copy of the base iteration. Only then apply changes to the targeted elements.
- **Surgical edits only**: Do NOT redesign the layout, restructure the component, or restyle non-targeted elements.
- **Props interface**: Keep it IDENTICAL to the original component (no added/removed/renamed props, no type changes).
- **Tree manifest**: Update ${iterationsTree()} for each new iteration file.
- Do not edit iterations/index.ts — the server rebuilds it from written iteration files.
- Include @sourceIteration {{sourceIterationFilename}} in the metadata comment
- Each iteration must modify the targeted elements differently — they should be visually distinct from each other.

QUALITY CHECKLIST (apply to EACH iteration)
- [ ] Props interface unchanged from original
- [ ] All non-targeted elements are pixel-identical to the base iteration
- [ ] Only the targeted elements have been modified
- [ ] All imports resolve correctly with no TypeScript errors
- [ ] Metadata comment included with correct @iteration/@parent/@sourceIteration
- [ ] File named correctly: {{cleanComponentName}}.iteration-{N}.tsx (filename prefix matches the default export function name)
- [ ] {{stylingQualityItem}}
- [ ] Entry added/updated in iterations/tree.json with correct parent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate all {{iterationCount}} iterations now.`;
}

export interface ElementIterationFromIterationPromptVars {
  skillSection?: string;
  componentName: string;
  sourcePath: string;
  iterationSourcePath: string;
  childrenSection?: string;
  cleanComponentName: string;
  componentId: string;
  customInstructionsSection?: string;
  elementSelectionsSection: string;
  iterationCount: string;
  iterationNumbersList: string;
  iterationSavesBlock: string;
  treeParent: string;
  sourceIterationFilename: string;
  stylingQualityItem: string;
  referenceNodesSection?: string;
}

export function elementIterationFromIterationPrompt(
  vars: ElementIterationFromIterationPromptVars,
): string {
  return fillTemplate(buildFromIterationPrompt(), vars as unknown as Record<string, string>);
}
