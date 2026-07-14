/**
 * @name: iteration-prompt
 * @description: Prompt used to generate new component iterations from the original source component in the playground
 */
import { fillTemplate } from './utility';
import { propsConstraint } from './shared-sections';
import {
  iterationsGuide,
  iterationsIndex,
  iterationsTree,
} from '@pg/shared/lib/playground-paths';

function buildPrompt(): string {
  return `
{{skillSection}}
ITERATION REQUEST
═════════════════

Component: {{componentName}}
Source: {{sourcePath}}
Iterations requested: {{iterationCount}}
{{childrenSection}}
Props interface (DO NOT MODIFY):
{{propsInterface}}
{{referenceNodesSection}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the source component at the path above
3. Understand its structure, props interface, and current design
4. Generate {{iterationCount}} **compatible** variations numbered {{iterationNumbersList}} (you may change both layout and visual design)
5. Process iterations ONE AT A TIME in the order listed below. For each iteration, complete ALL of the following steps before moving to the next:
   a. Create and save the iteration file
   b. Include metadata comment with @iteration, @parent, and @description
   c. Immediately register that file in ${iterationsIndex()} (map key MUST include ".tsx")
   d. Immediately add a matching entry to ${iterationsTree()} with parent set to "{{componentId}}"
   e. Only then start the next iteration

   This sequential approach ensures each iteration is visible on the canvas as soon as it's done.

Files to create (in this order):
{{iterationSavesBlock}}

IMPORTANT
- Iteration numbers MUST be {{iterationNumbersList}} — do NOT reuse existing iteration numbers
{{customInstructionsSection}}
CRITICAL REQUIREMENTS
${propsConstraint()}

CREATIVE LAYOUT & THEME FREEDOM
- Explore bold, unconventional layouts: asymmetric grids, overlapping elements, unusual spacing, and creative alignments.
- {{stylingConstraint}}
- Each iteration must be structurally and/or visually distinct from the original and from other iterations.

{{qualityChecklist}}
- [ ] Layout and/or visual design is meaningfully different and creatively structured
- [ ] Iteration is distinct from all other iterations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate the iterations now.`;
}

export interface IterationPromptVars {
  skillSection?: string;
  componentName: string;
  sourcePath: string;
  iterationCount: string;
  childrenSection?: string;
  propsInterface: string;
  cleanComponentName: string;
  componentId: string;
  customInstructionsSection?: string;
  stylingConstraint: string;
  qualityChecklist: string;
  iterationNumbersList: string;
  iterationSavesBlock: string;
  referenceNodesSection?: string;
}

export function iterationPrompt(vars: IterationPromptVars): string {
  return fillTemplate(buildPrompt(), vars as unknown as Record<string, string>);
}
