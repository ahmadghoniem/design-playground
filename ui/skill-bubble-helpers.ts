import type { CSSProperties } from 'react';

const PASTEL_COLORS: readonly string[] = [
  '#FFB5A7',
  '#FFD4A8',
  '#FFE5A8',
  '#C8EBC0',
  '#A8DADC',
  '#A8C5FF',
  '#C8B8FF',
  '#F5C6E0',
  '#FFCAD4',
  '#B5EAD7',
];

function hashToIndex(input: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

export function getSkillBubbleColor(skillId: string): string {
  return PASTEL_COLORS[hashToIndex(skillId, PASTEL_COLORS.length)];
}

export function getSkillBubbleStyle(skillId: string, size = 24): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: getSkillBubbleColor(skillId),
    boxShadow: [
      '0 1px 3px rgba(0, 0, 0, 0.12)',
      'inset 0 -3px 4px 0 rgba(0, 0, 0, 0.08)',
      'inset 0 3px 3px 0 rgba(255, 255, 255, 0.45)',
    ].join(', '),
    flexShrink: 0,
  };
}
