/**
 * @name: iteration-from-iteration-prompt
 * @description: Prompt used to generate new component iterations derived from an existing iteration file in the playground.
 */
import { fillTemplate } from './utility';
import { getSequentialIterationRitual } from './shared-sections';
import { iterationsGuide } from '@pg/shared/lib/playground-paths';

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
{{referenceNodesSection}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the BASE ITERATION at: {{iterationSourcePath}}
3. Also read the ORIGINAL component for context: {{sourcePath}}
4. Generate {{iterationCount}} new variations based on the base iteration
5. ${getSequentialIterationRitual({
    includeSourceIteration: true,
    parentPlaceholder: '{{treeParent}}',
  })}

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
