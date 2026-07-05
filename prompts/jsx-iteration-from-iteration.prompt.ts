/**
 * Prompt template for generating JSX iterations from an existing JSX iteration.
 */
import { fillTemplate } from "./utility";

const prompt = `
{{skillSection}}
JSX COMPONENT ITERATION REQUEST (FROM ITERATION)
═════════════════════════════════════════════════

Component: {{componentName}}
Source iteration: src/app/playground/canvas-components/{{sourceFilename}}
Iterations requested: {{iterationCount}}
INSTRUCTIONS

1. Read the source iteration at src/app/playground/canvas-components/{{sourceFilename}}
2. Understand its structure, layout, visual design, and behavior
3. Generate {{iterationCount}} variations numbered {{iterationNumbersList}}
4. For each iteration N, save as: src/app/playground/canvas-components/{{baseName}}.iteration-N.tsx
5. Complete each iteration fully before starting the next

CRITICAL REQUIREMENTS
- Each file MUST have a default export (export default function ComponentName() { ... })
- Components MUST be fully self-contained units:
  • Use ONLY inline styles or style objects — NO external CSS imports, NO Tailwind, NO CSS modules
  • The ONLY allowed import is 'react' (e.g. import React, { useState } from 'react')
  • Do NOT import any UI library: no shadcn/ui, no @radix-ui, no lucide-react, no @/components, no framer-motion, no any other package — no framework image/link helpers either (use plain <img>/<a> tags), since 'react' is the only allowed import
  • Do NOT import anything from the playground codebase — these components render inside the playground and must not affect its UI
  • All icons, images, and assets must be inline SVG or CSS-based
- Preserve the component's core functionality and structure
- Each variation should be a complete, working React component
- Output ONLY the component itself, at its natural size. Do NOT wrap it in a page-level container or add any outer centering/padding: no full-viewport wrapper, no minHeight/100vh, no display:'flex' centering, and no large padding around the component's root element. The playground sizes and positions the node — the file must render just the component so it sits flush (small components MUST stay small).
{{customInstructionsSection}}

CREATIVE LAYOUT & THEME FREEDOM (when iterationCount > 1)
- Explore bold layouts INSIDE the component: asymmetric grids, overlapping elements, creative spacing between the component's own elements — never an outer page wrapper or padding around the whole thing
- Vary color schemes, typography, and visual hierarchy
- Each iteration must be structurally and/or visually distinct from the source and other iterations

QUALITY CHECKLIST
- [ ] Has a default export
- [ ] Only imports from 'react' — zero other packages
- [ ] Self-contained styles (inline/style objects only, no Tailwind, no CSS imports)
- [ ] No UI library imports (no shadcn, radix, lucide, framework image/link helpers, @/components, etc.)
- [ ] Renders without errors
- [ ] Visually distinct from source and other iterations`;

export interface JsxIterationFromIterationPromptVars {
  skillSection?: string;
  componentName: string;
  baseFilename: string;
  baseName: string;
  sourceFilename: string;
  iterationCount: string;
  iterationNumbersList: string;
  customInstructionsSection?: string;
}

export function jsxIterationFromIterationPrompt(
  vars: JsxIterationFromIterationPromptVars,
): string {
  return fillTemplate(prompt, vars as unknown as Record<string, string>);
}
