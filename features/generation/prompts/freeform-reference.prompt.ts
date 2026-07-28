/**
 * @name: freeform-reference-prompt
 * @description: Prompt for generating a brand-new component using selected canvas nodes as design references.
 */
import { fillTemplate } from '@pg/shared/lib/fill-template';
import {
  iterationsFile,
  iterationsGuide,
  iterationsTree,
} from '@pg/shared/lib/playground-paths';

function buildPrompt(): string {
  return `
{{skillSection}}
NEW COMPONENT REQUEST
═════════════════════

You are creating a brand-new React component based on the user's instructions
and the design references provided below.

{{referenceNodesSection}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the source code of each reference component listed above
3. Examine the screenshots provided to understand their current visual appearance
4. Choose an appropriate PascalCase name for the new component based on:
   - The user's instructions below
   - The purpose and context of the reference components
   - The name should be descriptive and concise (e.g. "LandingHero", "DashboardOverview")
5. Create the component and save it as:
   ${iterationsFile('{ChosenName}.iteration-1.tsx')}
6. Include the required metadata comment block:
   /**
    * @iteration 1
    * @parent {ChosenName}
    * @description {Brief description of the component}
    */
7. Add an entry to ${iterationsTree()} with parent set to "{ChosenName}"
   (Do not edit iterations/index.ts — the server rebuilds it from written iteration files.)
{{customInstructionsSection}}

CRITICAL REQUIREMENTS
- {{stylingConstraint}}
- The component must be a valid React functional component with a default export
- Use patterns, styles, and visual language consistent with the reference components
- The component should be self-contained and renderable on its own

QUALITY CHECKLIST
- [ ] Component has a descriptive PascalCase name
- [ ] File saved as {ChosenName}.iteration-1.tsx
- [ ] Metadata comment included with @iteration, @parent, @description
- [ ] All imports resolve correctly with no TypeScript errors
- [ ] Entry added in iterations/tree.json
- [ ] Visual style is consistent with reference components

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate the new component now.`;
}

export interface FreeformReferencePromptVars {
  skillSection?: string;
  referenceNodesSection: string;
  customInstructionsSection?: string;
  stylingConstraint: string;
}

export function freeformReferencePrompt(vars: FreeformReferencePromptVars): string {
  return fillTemplate(buildPrompt(), vars as unknown as Record<string, string>);
}
