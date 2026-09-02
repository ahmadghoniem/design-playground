import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClaudeCodeOptions } from '@pg/shared/lib/agent-config';
import {
  DEFAULT_CLAUDE_CODE_OPTIONS,
  AGENT_MODELS,
  AGENT_DEFAULT_ENABLED_MODELS,
} from '@pg/shared/lib/agent-config';
import type { ModelOption } from '@pg/shared/lib/constants';
import { migrateEnabledModels } from '@pg/shared/lib/model-catalog';

interface ModelSettingsState {
  hasHydrated: boolean;

  enabledModels: string[];
  availableModels: ModelOption[];
  hasFetched: boolean;

  isLoadingModels: boolean;

  toggleModel: (value: string) => void;
  setEnabledModels: (values: string[]) => void;
  resetToAll: () => void;
  fetchModels: () => Promise<void>;

  claudeCodeOptions: ClaudeCodeOptions;
  setClaudeCodeOptions: (opts: Partial<ClaudeCodeOptions>) => void;
}

const STORE_KEY = 'playground-model-settings-v3';

export const useModelSettingsStore = create<ModelSettingsState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,

      enabledModels: AGENT_DEFAULT_ENABLED_MODELS,
      availableModels: AGENT_MODELS,
      hasFetched: false,

      isLoadingModels: false,

      toggleModel: (value: string) =>
        set((state) => {
          const current = state.enabledModels;
          if (current.includes(value)) {
            if (current.length <= 1) return state;
            return { enabledModels: current.filter((v) => v !== value) };
          }
          return { enabledModels: [...current, value] };
        }),

      setEnabledModels: (values: string[]) => set({ enabledModels: values }),

      resetToAll: () => set({ enabledModels: AGENT_DEFAULT_ENABLED_MODELS }),

      fetchModels: async () => {
        if (get().isLoadingModels) return;
        set({ isLoadingModels: true });
        try {
          const response = await fetch('/playground/api/models');
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data?.error || 'Failed to fetch models');
          }
          if (Array.isArray(data.models) && data.models.length > 0) {
            set({ availableModels: data.models, hasFetched: true });
          } else {
            throw new Error('No models returned from API');
          }
        } catch (error) {
          console.error('[Models] Failed to fetch models:', error);
          set({ hasFetched: true });
        } finally {
          set({ isLoadingModels: false });
        }
      },

      claudeCodeOptions: DEFAULT_CLAUDE_CODE_OPTIONS,
      setClaudeCodeOptions: (opts: Partial<ClaudeCodeOptions>) =>
        set((state) => ({
          claudeCodeOptions: { ...state.claudeCodeOptions, ...opts },
        })),
    }),
    {
      name: STORE_KEY,
      version: 2,
      onRehydrateStorage: () => () => {
        useModelSettingsStore.setState({ hasHydrated: true });
      },
      // v1 (provider-indexed) → v2 (flat): lift the single provider's
      // enabledModels/claudeCodeOptions out of `providerState['claude-code']`
      // so existing users keep their selected models after the collapse.
      migrate: (persisted: unknown, _version: number) => {
        if (!persisted || typeof persisted !== 'object') {
          return persisted as ModelSettingsState;
        }
        const state = persisted as Record<string, unknown>;

        const hasLegacyShape = 'providerState' in state || 'activeProvider' in state;
        if (hasLegacyShape) {
          const providerState = state.providerState as
            | Record<string, { enabledModels?: string[] } | undefined>
            | undefined;
          const legacyEnabled = providerState?.['claude-code']?.enabledModels ?? [];
          return {
            enabledModels: migrateEnabledModels(
              legacyEnabled,
              AGENT_DEFAULT_ENABLED_MODELS,
            ),
            claudeCodeOptions:
              (state.claudeCodeOptions as ClaudeCodeOptions | undefined) ??
              DEFAULT_CLAUDE_CODE_OPTIONS,
          } as Partial<ModelSettingsState>;
        }

        return state as unknown as ModelSettingsState;
      },
      partialize: (state) => ({
        enabledModels: state.enabledModels,
        claudeCodeOptions: state.claudeCodeOptions,
      }),
    },
  ),
);
