import type { ModelOption } from './constants';
import type { ProviderId } from './providers/types';

// ---------------------------------------------------------------------------
// Claude Code static catalog (no CLI list command — docs-verified slugs)
// ---------------------------------------------------------------------------

/** Alias models shown by default; always track Anthropic's latest for each tier. */
export const CLAUDE_FEATURED_MODEL_IDS = [
  'sonnet',
  'opus',
  'haiku',
  'fable',
] as const;

/**
 * Full Claude Code model catalog from https://code.claude.com/docs/en/model-config
 * Aliases auto-update; pinned `claude-*` ids lock a specific version.
 */
export const CLAUDE_FALLBACK_MODELS: ModelOption[] = [
  { value: 'sonnet', label: 'Sonnet (latest)' },
  { value: 'opus', label: 'Opus (latest)' },
  { value: 'haiku', label: 'Haiku (fast)' },
  { value: 'fable', label: 'Fable 5' },
  { value: 'claude-opus-4-8', label: 'Opus 4.8' },
  { value: 'claude-opus-4-8[1m]', label: 'Opus 4.8 (1M context)' },
  { value: 'claude-opus-4-7', label: 'Opus 4.7' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { value: 'sonnet[1m]', label: 'Sonnet (1M context)' },
  { value: 'opus[1m]', label: 'Opus (1M context)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
  { value: 'claude-fable-5', label: 'Fable 5 (pinned)' },
  { value: 'best', label: 'Best available' },
  { value: 'opusplan', label: 'Opus plan + Sonnet execute' },
];

/** Minimum Claude Code versions for newer models (for UI hints). */
export const CLAUDE_MIN_VERSIONS = {
  opus48: '2.1.154',
  fable5: '2.1.170',
} as const;

// ---------------------------------------------------------------------------
// Legacy slug migration
// ---------------------------------------------------------------------------

const CLAUDE_LEGACY_ALIASES: Record<string, string> = {
  'claude-opus-4-6': 'claude-opus-4-8',
  'claude-sonnet-4-5': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
};

export const LEGACY_MODEL_ALIASES: Record<string, string> = {
  ...CLAUDE_LEGACY_ALIASES,
};

/**
 * Map a possibly-stale model id to its current equivalent.
 * Returns the input unchanged when no migration applies.
 */
export function migrateModelId(_providerId: ProviderId, model: string): string {
  const trimmed = model.trim();
  if (!trimmed) return trimmed;
  return CLAUDE_LEGACY_ALIASES[trimmed] ?? trimmed;
}

/** Migrate and dedupe a list of enabled model ids, falling back to defaults when empty. */
export function migrateEnabledModels(
  providerId: ProviderId,
  ids: string[],
  defaultIds: readonly string[],
): string[] {
  const migrated = ids
    .map((id) => migrateModelId(providerId, id))
    .filter((id) => id !== '');

  const unique = [...new Set(migrated)];
  return unique.length === 0 ? [...defaultIds] : unique;
}

// ---------------------------------------------------------------------------
// Claude Code model partitioning (aliases vs pinned full names)
// ---------------------------------------------------------------------------

export interface ModelPartition {
  featured: ModelOption[];
  advanced: ModelOption[];
}

function buildClaudeFeaturedList(allModels: ModelOption[]): ModelOption[] {
  const byId = new Map(allModels.map((m) => [m.value, m]));
  const featured: ModelOption[] = [];

  for (const id of CLAUDE_FEATURED_MODEL_IDS) {
    const found = byId.get(id);
    if (found) {
      featured.push(found);
    } else {
      const fallback = CLAUDE_FALLBACK_MODELS.find((m) => m.value === id);
      if (fallback) featured.push(fallback);
    }
  }

  return featured;
}

/** Split Claude models into featured aliases and advanced pinned ids. */
export function partitionClaudeModels(allModels: ModelOption[]): ModelPartition {
  const featuredIds = new Set<string>(CLAUDE_FEATURED_MODEL_IDS);
  const featured = buildClaudeFeaturedList(allModels);
  const advanced = allModels.filter((m) => !featuredIds.has(m.value));
  return { featured, advanced };
}

export function isModelEnabled(
  _providerId: ProviderId,
  modelValue: string,
  enabledIds: readonly string[],
): boolean {
  return enabledIds.includes(modelValue);
}
