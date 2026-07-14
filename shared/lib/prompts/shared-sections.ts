// ---------------------------------------------------------------------------
// Shared Prompt Sections
// ---------------------------------------------------------------------------
// Reusable prompt content shared across iteration templates.
// ---------------------------------------------------------------------------

import type { StylingMode } from '@pg/shared/lib/constants';
import {
  iterationsFile,
  iterationsIndex,
  iterationsTree,
} from '@pg/shared/lib/playground-paths';

// ---------------------------------------------------------------------------
// Styling constraint resolvers
// ---------------------------------------------------------------------------

/** Returns the styling constraint instruction for a given mode */
export function getStylingConstraint(mode: StylingMode): string {
  if (mode === 'inline-css') {
    return 'You may use inline style={{}} for any CSS property. Do NOT use Tailwind utility classes for visual styling. Use inline styles for maximum creative expressiveness.';
  }
  return "Use only existing Tailwind classes already present in the codebase. Prefer the host app's semantic theme tokens (bg-background, text-foreground, bg-primary, text-primary-foreground, bg-card, bg-muted, text-muted-foreground, border-border, etc.) over literal colors so the result inherits the host's theme — including light/dark mode. Do NOT hardcode hex/rgb colors. Do not use inline style={{}}.";
}

/** Returns the quality checklist line item for styling */
export function getStylingQualityItem(mode: StylingMode): string {
  if (mode === 'inline-css') {
    return 'Uses inline style={{}} for styling (no Tailwind utility classes)';
  }
  return "Uses the host's semantic theme tokens (no hardcoded hex); only allowed Tailwind classes already present in the codebase";
}

/** Returns the full quality checklist with the appropriate styling line */
export function getQualityChecklist(mode: StylingMode = 'tailwind'): string {
  return `QUALITY CHECKLIST (FOR EACH ITERATION)
- [ ] Props interface unchanged from original
- [ ] All imports resolve correctly with no TypeScript errors
- [ ] Metadata comment included with correct @iteration/@parent (and @sourceIteration when applicable)
- [ ] File named correctly: PascalCaseComponentName.iteration-{n}.tsx (must match the default export function name)
- [ ] ${getStylingQualityItem(mode)}
- [ ] Registered in iterations/index.ts with a ".tsx" key
- [ ] Entry added/updated in iterations/tree.json with correct parent
- [ ] @sourceIteration set when derived from another iteration`;
}

/** Props constraint block shared across templates (paths resolved at call time). */
export function propsConstraint(): string {
  return `- **Props interface**: Keep it IDENTICAL to the original component (no added/removed/renamed props, no type changes).
- **Tree manifest**: Update ${iterationsTree()} for every new iteration file.
- **Registry index**: Register every iteration in ${iterationsIndex()} with a ".tsx" map key.`;
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

export function formatSkillSection(skillPrompt?: string): string {
  if (!skillPrompt || !skillPrompt.trim()) return '';
  return `SKILL CONTEXT (read each SKILL.md at the repo paths below)
══════════════

${skillPrompt.trim()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
