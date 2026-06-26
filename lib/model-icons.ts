import claudeIcon from '../assets/claude-icon-white.svg';
import openaiIcon from '../assets/openai-icon.svg';
import geminiIcon from '../assets/gemini-icon.svg';

const ICON_SRC = (icon: unknown) =>
  (icon as { src?: string }).src ?? (icon as string);

export interface ModelIconConfig {
  src: string;
  /** Background color for the bubble face (e.g. #1c1917) */
  bg: string;
}

const MODEL_ICON_CONFIGS: Record<string, ModelIconConfig> = {
  claude: { src: ICON_SRC(claudeIcon), bg: '#D77655' },
  openai: { src: ICON_SRC(openaiIcon), bg: '#1c1917' },
  gemini: { src: ICON_SRC(geminiIcon), bg: '#ffffff' },
};

export function getModelIcon(modelValue: string, providerId?: string): string {
  return getModelIconConfig(modelValue, providerId).src;
}

export function getModelIconConfig(modelValue: string, _providerId?: string): ModelIconConfig {
  const v = modelValue.toLowerCase();

  if (
    !v ||
    v.includes('claude') ||
    v.includes('opus') ||
    v.includes('sonnet') ||
    v.includes('haiku') ||
    v.includes('fable') ||
    v === 'best' ||
    v === 'opusplan'
  ) {
    return MODEL_ICON_CONFIGS.claude;
  }

  if (
    v.includes('gpt') ||
    v.includes('openai') ||
    v.includes('codex') ||
    v.includes('o1') ||
    v.includes('o3') ||
    v.includes('o4')
  ) {
    return MODEL_ICON_CONFIGS.openai;
  }

  if (v.includes('gemini')) return MODEL_ICON_CONFIGS.gemini;

  return MODEL_ICON_CONFIGS.claude;
}
