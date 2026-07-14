/**
 * @name: iteration-from-iteration-prompt
 * @description: Prompt used to generate new component iterations derived from an existing iteration file in the playground.
 */
import { fillTemplate } from '@pg/shared/lib/prompts/utility';
import {
  iterationsGuide,
  iterationsIndex,
  iterationsTree,
} from '@pg/shared/lib/playground-paths';

function buildPrompt(): string {
  return `
{{skillSection}}
ITERATION REQUEST (from existing iteration)
═════════════════════════════════════════════

Component: {{componentName}}
Original source: {{sourcePath}}
Base iteration: {{iterationSourcePath}}
Iterations requested: {{iterationCount}} (numbered {{startNumber}}–{{endNumber}})
{{childrenSection}}
Props interface (DO NOT MODIFY):
{{propsInterface}}
{{referenceNodesSection}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the BASE ITERATION at: {{iterationSourcePath}}
3. Also read the ORIGINAL component for context: {{sourcePath}}
4. Generate {{iterationCount}} new variations based on the base iteration
5. Process iterations ONE AT A TIME in the order listed below. For each iteration, complete ALL of the following steps before moving to the next:
   a. Create and save the iteration file
   b. Include metadata comment with @iteration, @parent, @sourceIteration {{sourceIterationFilename}}, and @description
   c. Immediately register that file in ${iterationsIndex()} (map key MUST include ".tsx")
   d. Immediately add a matching entry to ${iterationsTree()} with parent set to "{{treeParent}}"
   e. Only then start the next iteration

   This sequential approach ensures each iteration is visible on the canvas as soon as it's done.

Files to create (in this order):
{{iterationSavesBlock}}
{{customInstructionsSection}}
IMPORTANT
- Use the BASE ITERATION as your starting point, NOT the original component
- Each new variation should diverge from the base iteration in meaningful ways
- Iteration numbers MUST be {{iterationNumbersList}} (continuing from existing iterations)
- Include @sourceIteration {{sourceIterationFilename}} in each file's metadata comment

CONSTRAINTS
- Keep props interface identical
- {{stylingConstraint}}
- Include metadata comment in each file (with correct @iteration number AND @sourceIteration)
- Make each iteration meaningfully different from the base and from each other

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate the iterations now.`;
}

export interface IterationFromIterationPromptVars {
  skillSection?: string;
  componentName: string;
  sourcePath: string;
  iterationSourcePath: string;
  iterationCount: string;
  startNumber: string;
  endNumber: string;
  childrenSection?: string;
  propsInterface: string;
  iterationSavesBlock: string;
  treeParent: string;
  customInstructionsSection?: string;
  iterationNumbersList: string;
  sourceIterationFilename: string;
  stylingConstraint: string;
  referenceNodesSection?: string;
}

export function iterationFromIterationPrompt(
  vars: IterationFromIterationPromptVars,
): string {
  return fillTemplate(buildPrompt(), vars as unknown as Record<string, string>);
}
