/**
 * @name: iteration-prompt
 * @description: Prompts used to generate new component iterations — either from the original
 *   source component, or derived from an existing iteration file.
 *
 * Both variants live here for the same reason element-iteration.prompt.ts holds its pair: they
 * differ only in where the agent starts reading, so keeping them side by side makes the divergence
 * visible. The prose is deliberately NOT shared between them — prompt wording is behaviour.
 */
import { fillTemplate } from '@pg/shared/lib/fill-template';
import {
  getSequentialIterationRitual,
  propsConstraint,
} from './shared-sections';
import { iterationsGuide } from '@pg/shared/lib/playground-paths';

// ---------------------------------------------------------------------------
// From the original source component
// ---------------------------------------------------------------------------

function buildPrompt(): string {
  return `
ITERATION REQUEST
═════════════════

Component: {{componentName}}
Source: {{sourcePath}}
Iterations requested: {{iterationCount}}
{{childrenSection}}
{{referenceNodesSection}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS

1. Read the generation guide: ${iterationsGuide()}
2. Read the source component at the path above
3. Understand its structure, props interface, and current design
4. Generate {{iterationCount}} **compatible** variations numbered {{iterationNumbersList}} (you may change both layout and visual design)
5. ${getSequentialIterationRitual({ parentPlaceholder: '{{componentId}}' })}

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
  componentName: string;
  sourcePath: string;
  iterationCount: string;
  childrenSection?: string;
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

// ---------------------------------------------------------------------------
// From an existing iteration
// ---------------------------------------------------------------------------

function buildFromIterationPrompt(): string {
  return `
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
  return fillTemplate(
    buildFromIterationPrompt(),
    vars as unknown as Record<string, string>,
  );
}
