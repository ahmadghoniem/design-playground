/**
 * @name: adopt-iteration-prompt
 * @description: Prompt used to adopt an iteration's layout and styling into the original source component without breaking its public API.
 *
 * Owned by the iterations feature: adoption is an iteration-node action
 * (`useIterationAdoption`), so both the template and the builder live here
 * rather than in the generation feature.
 */
import { fillTemplate } from "@pg/shared/lib/fill-template";
import { iterationsFile } from "@pg/shared/lib/playground-paths";
import { resolveRegistryItem } from "@pg/registry";

const prompt = `
ADOPT ITERATION
═══════════════

Original Component: {{originalPath}}
Iteration to Adopt: {{iterationPath}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK

Replace the UI implementation of the original component with the layout/styling from the iteration, while ensuring ZERO breaking changes.

INSTRUCTIONS

1. Read both files:
   - Original: {{originalPath}}
   - Iteration: {{iterationPath}}

2. In the ORIGINAL component file:
   - Replace the JSX/render logic with the iteration's layout
   - Keep ALL existing imports that are still needed
   - Keep the EXACT same props interface and types
   - Keep ALL existing function logic (handlers, effects, computed values)
   - Keep the same export (default/named) as before

3. Do NOT:
   - Change the props interface in any way
   - Remove any existing functionality
   - Change the component's public API
   - Rename the component
   - Move the file

VERIFICATION CHECKLIST

Before saving, verify:
- [ ] Props interface is IDENTICAL to before
- [ ] All existing imports still resolve
- [ ] No TypeScript errors
- [ ] Component name unchanged
- [ ] Export style unchanged (default/named)
- [ ] All event handlers preserved
- [ ] All hooks/effects preserved
- [ ] File location unchanged

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adopt the iteration now. Only modify the original component file.`;

/** Build the adopt prompt for an iteration of `componentId` saved as `iterationFilename`. */
export function generateAdoptPrompt(
  componentId: string,
  iterationFilename: string,
): string {
  const item = resolveRegistryItem(componentId);
  const originalPath =
    item?.sourcePath ||
    `src/components/${iterationFilename.split(".iteration")[0]}.tsx`;
  const iterationPath = iterationsFile(iterationFilename);

  return fillTemplate(prompt, { originalPath, iterationPath });
}
