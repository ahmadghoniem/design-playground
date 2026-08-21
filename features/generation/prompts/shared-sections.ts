// ---------------------------------------------------------------------------
// Shared Prompt Sections
// ---------------------------------------------------------------------------
// Reusable prompt content shared across iteration templates.
// ---------------------------------------------------------------------------

import {
  iterationsFile,
  iterationsTree,
} from '@pg/shared/lib/playground-paths';

// ---------------------------------------------------------------------------
// Styling constraint resolvers
// ---------------------------------------------------------------------------

/** Returns the styling constraint instruction */
export function getStylingConstraint(): string {
  return "Use only existing Tailwind classes already present in the codebase. Prefer the host app's semantic theme tokens (bg-background, text-foreground, bg-primary, text-primary-foreground, bg-card, bg-muted, text-muted-foreground, border-border, etc.) over literal colors so the result inherits the host's theme — including light/dark mode. Do NOT hardcode hex/rgb colors. Do not use inline style={{}}.";
}

/** Returns the quality checklist line item for styling */
export function getStylingQualityItem(): string {
  return "Uses the host's semantic theme tokens (no hardcoded hex); only allowed Tailwind classes already present in the codebase";
}

/**
 * Import rewriting rule.
 *
 * Iterations are written to <playground>/iterations/, NOT next to the original
 * component, so any relative import copied verbatim from the source silently
 * re-anchors to the playground dir and fails to resolve. This is the single
 * most common way a generated iteration breaks the host's dev server.
 */
export function importConstraint(): string {
  return `- **Imports**: The iteration is saved to a DIFFERENT directory than the original, so relative imports from the source will NOT resolve. Rewrite every relative ("../" or "./") import from the original to the host alias "@/" (which maps to the host's "src/"), deriving the original's location from its source path. Example: a component at src/features/daily-recap/components/DailyRecapItem.tsx importing "../hooks/useDailyRecap" MUST become "@/features/daily-recap/hooks/useDailyRecap". Imports that are already "@/..." or bare packages (react, lucide-react) are copied unchanged.`;
}

/** Returns the full quality checklist with the appropriate styling line */
export function getQualityChecklist(): string {
  return `QUALITY CHECKLIST (FOR EACH ITERATION)
- [ ] Props interface unchanged from original
- [ ] No relative ("../" or "./") imports copied from the original — every one rewritten to the "@/" host alias
- [ ] All imports resolve correctly with no TypeScript errors
- [ ] Metadata comment included with correct @iteration/@parent (and @sourceIteration when applicable)
- [ ] File named correctly: PascalCaseComponentName.iteration-{n}.tsx (must match the default export function name)
- [ ] ${getStylingQualityItem()}
- [ ] Entry added/updated in iterations/tree.json with correct parent
- [ ] @sourceIteration set when derived from another iteration`;
}

/** Shared constraint block used by templates (paths resolved at call time). */
export function propsConstraint(): string {
  return `- **Props interface**: Keep it IDENTICAL to the original component (no added/removed/renamed props, no type changes).
${importConstraint()}
- **Tree manifest**: Update ${iterationsTree()} for every new iteration file.
- Do not edit iterations/index.ts — the server rebuilds it from written iteration files.`;
}

/**
 * Shared one-at-a-time save → metadata → tree ritual.
 * iterations/index.ts is rebuilt server-side; agents must not hand-edit it.
 */
export function getSequentialIterationRitual(opts: {
  includeSourceIteration?: boolean;
  sourceIterationPlaceholder?: string;
  parentPlaceholder: string;
}): string {
  const metadataLine = opts.includeSourceIteration
    ? `   b. Include metadata comment with @iteration, @parent, @sourceIteration ${opts.sourceIterationPlaceholder ?? '{{sourceIterationFilename}}'}, and @description`
    : '   b. Include metadata comment with @iteration, @parent, and @description';

  return `Process iterations ONE AT A TIME in the order listed below. For each iteration, complete ALL of the following steps before moving to the next:
   a. Create and save the iteration file
${metadataLine}
   c. Immediately add a matching entry to ${iterationsTree()} with parent set to "${opts.parentPlaceholder}"
   d. Only then start the next iteration

   This sequential approach ensures each iteration is visible on the canvas as soon as it's done.`;
}

// ---------------------------------------------------------------------------
// Prompt section formatters
// ---------------------------------------------------------------------------

export function formatChildrenSection(children?: string[]): string {
  if (!children || children.length === 0) return '';
  return `
Children to keep stable:
${children.map((c) => `- ${c}`).join('\n')}
`;
}

export function formatCustomInstructionsSection(customInstructions?: string): string {
  if (!customInstructions || !customInstructions.trim()) return '';
  return `

CUSTOM INSTRUCTIONS:
Work fast without sacrificing quality — run parallel agents while creating the iterations to speed this up.
${customInstructions.trim()}

`;
}

export function formatReferenceNodesSection(
  nodes?: {
    componentName: string;
    type: 'component' | 'iteration' | 'image' | 'text';
    sourceFilename?: string;
    sourcePath?: string;
    imagePath?: string;
    imageUrl?: string;
    textContent?: string;
  }[],
): string {
  if (!nodes || nodes.length === 0) return '';

  const lines: string[] = [
    'REFERENCE COMPONENTS',
    '════════════════════',
    '',
    'The following components/images are selected on the canvas as design references.',
    'Use their visual style, structure, and patterns as context.',
    '',
  ];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const typeLabel =
      node.type === 'text'
        ? 'text note'
        : node.type === 'image'
          ? 'image reference'
          : node.type === 'iteration'
            ? 'iteration'
            : 'component';
    const path = node.type === 'text' ? undefined : node.type === 'image'
      ? (node.imagePath || node.imageUrl)
      : (node.sourcePath || (node.sourceFilename
        ? iterationsFile(node.sourceFilename)
        : undefined));

    lines.push(`${i + 1}. ${node.componentName} (${typeLabel})${path ? ` — ${path}` : ''}`);

    if (node.type === 'text' && node.textContent) {
      lines.push(`   Text note content: "${node.textContent}"`);
      lines.push(`   Use this text as design context or instructions.`);
    } else if (node.type === 'image' && (node.imagePath || node.imageUrl)) {
      if (node.imagePath) {
        lines.push(`   Repo file: ${node.imagePath}`);
      }
      if (node.imageUrl) {
        lines.push(`   Public URL: ${node.imageUrl}`);
      }
      lines.push(`   Read this image to understand the visual design to match.`);
    }

    lines.push('');
  }

  lines.push('Maintain visual and structural consistency with these reference components.');
  lines.push('Use listed source paths when present.');

  return lines.join('\n');
}

export function formatElementSelectionsSection(
  elements?: {
    tagName: string;
    displayName: string;
    textContent: string;
    cssSelector: string;
    htmlSource: string;
    ancestorComponents: string[];
    nodeId: string;
    componentName: string;
  }[],
): string {
  if (!elements || elements.length === 0) return '';

  const lines: string[] = [
    'TARGETED ELEMENTS',
    '══════════════════',
    '',
  ];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    lines.push(`Element ${i + 1}: <${el.tagName}> in ${el.componentName}`);

    if (el.textContent) {
      lines.push(`- Text: "${el.textContent}"`);
    }

    if (el.cssSelector) {
      lines.push(`- Selector: ${el.cssSelector}`);
    }

    if (el.htmlSource) {
      lines.push(`- HTML: ${el.htmlSource}`);
    }

    if (el.ancestorComponents.length > 0) {
      lines.push(`- Component ancestry: ${el.ancestorComponents.join(' > ')}`);
    }

    lines.push('');
  }

  lines.push('Focus your changes on these specific elements while keeping the rest of the component intact.');

  return lines.join('\n');
}
