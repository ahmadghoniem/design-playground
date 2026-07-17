import claudeIcon from '@pg/assets/claude-icon-white.svg';

const ICON_SRC = (icon: unknown) =>
  (icon as { src?: string }).src ?? (icon as string);

export interface ModelIconConfig {
  src: string;
  /** Background color for the bubble face (e.g. #1c1917) */
  bg: string;
}

const CLAUDE_ICON: ModelIconConfig = {
  src: ICON_SRC(claudeIcon),
  bg: '#D77655',
};

/** Claude Code is the only agent — always return the Claude icon. */
export function getModelIconConfig(_modelValue?: string): ModelIconConfig {
  return CLAUDE_ICON;
}
