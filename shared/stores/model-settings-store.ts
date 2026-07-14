import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderId, ClaudeCodeOptions } from '@pg/shared/lib/providers/types';
import { DEFAULT_CLAUDE_CODE_OPTIONS } from '@pg/shared/lib/providers/types';
import {
  getProvider,
  DEFAULT_PROVIDER_ID,
  getAllProviderIds,
} from '@pg/shared/lib/providers/registry';
import type { ModelOption } from '@pg/shared/lib/constants';
import { migrateEnabledModels } from '@pg/shared/lib/model-catalog';

// ---------------------------------------------------------------------------
// Per-Provider State
// ---------------------------------------------------------------------------

interface PerProviderState {
  enabledModels: string[];
  availableModels: ModelOption[];
  hasFetched: boolean;
}

function makeDefaultProviderState(providerId: ProviderId): PerProviderState {
  const config = getProvider(providerId);
  return {
    enabledModels: config.defaultEnabledModels,
    availableModels: config.fallbackModels,
    hasFetched: false,
  };
}

function makeDefaultProviderStates(): Record<ProviderId, PerProviderState> {
  const states = {} as Record<ProviderId, PerProviderState>;
  for (const id of getAllProviderIds()) {
    states[id] = makeDefaultProviderState(id);
  }
  return states;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface ModelSettingsState {
  hasHydrated: boolean;

  /** Always Claude Code — kept for request payloads / persistence. */
  activeProvider: ProviderId;

  providerState: Record<ProviderId, PerProviderState>;

  readonly enabledModels: string[];
  readonly availableModels: ModelOption[];

  isLoadingModels: boolean;

  toggleModel: (value: string) => void;
  setEnabledModels: (values: string[]) => void;
  resetToAll: () => void;
  fetchModels: () => Promise<void>;

  claudeCodeOptions: ClaudeCodeOptions;
  setClaudeCodeOptions: (opts: Partial<ClaudeCodeOptions>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const STORE_KEY = 'playground-model-settings-v3';

export const useModelSettingsStore = create<ModelSettingsState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,

      activeProvider: DEFAULT_PROVIDER_ID,

      providerState: makeDefaultProviderStates(),

      get enabledModels() {
        const state = get();
        return state.providerState[state.activeProvider]?.enabledModels ?? [];
      },
      get availableModels() {
        const state = get();
        return state.providerState[state.activeProvider]?.availableModels ?? [];
      },

      isLoadingModels: false,

      toggleModel: (value: string) =>
        set((state) => {
          const ps = state.providerState[state.activeProvider];
          const current = ps.enabledModels;
          let next: string[];
          if (current.includes(value)) {
            if (current.length <= 1) return state;
            next = current.filter((v) => v !== value);
          } else {
            next = [...current, value];
          }
          return {
            providerState: {
              ...state.providerState,
              [state.activeProvider]: { ...ps, enabledModels: next },
            },
          };
        }),

      setEnabledModels: (values: string[]) =>
        set((state) => ({
          providerState: {
            ...state.providerState,
            [state.activeProvider]: {
              ...state.providerState[state.activeProvider],
              enabledModels: values,
            },
          },
        })),

      resetToAll: () =>
        set((state) => {
          const config = getProvider(state.activeProvider);
          return {
            providerState: {
              ...state.providerState,
              [state.activeProvider]: {
                ...state.providerState[state.activeProvider],
                enabledModels: config.defaultEnabledModels,
              },
            },
          };
        }),

      fetchModels: async () => {
        if (get().isLoadingModels) return;
        set({ isLoadingModels: true });
        const { activeProvider } = get();
        try {
          const response = await fetch(`/playground/api/models?provider=${activeProvider}`);
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data?.error || 'Failed to fetch models');
          }
          if (Array.isArray(data.models) && data.models.length > 0) {
            set((state) => ({
              providerState: {
                ...state.providerState,
                [activeProvider]: {
                  ...state.providerState[activeProvider],
                  availableModels: data.models,
                  hasFetched: true,
                },
              },
            }));
          } else {
            throw new Error('No models returned from API');
          }
        } catch (error) {
          console.error('[Models] Failed to fetch models:', error);
          set((state) => ({
            providerState: {
              ...state.providerState,
              [activeProvider]: {
                ...state.providerState[activeProvider],
                hasFetched: true,
              },
            },
          }));
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
      version: 1,
      onRehydrateStorage: () => () => {
        useModelSettingsStore.setState({ hasHydrated: true });
      },
      migrate: (persisted: unknown, _version: number) => {
        const defaultStates = makeDefaultProviderStates();

        if (persisted && typeof persisted === 'object') {
          const state = persisted as Partial<ModelSettingsState>;
          const mergedProviderState = { ...defaultStates, ...state.providerState };
          for (const id of getAllProviderIds()) {
            if (!mergedProviderState[id]) {
              mergedProviderState[id] = defaultStates[id];
            } else {
              const config = getProvider(id);
              const ps = mergedProviderState[id];
              mergedProviderState[id] = {
                ...ps,
                enabledModels: migrateEnabledModels(
                  id,
                  ps.enabledModels,
                  config.defaultEnabledModels,
                ),
                availableModels: config.fallbackModels,
                hasFetched: false,
              };
            }
          }

          return {
            ...state,
            activeProvider: DEFAULT_PROVIDER_ID,
            providerState: mergedProviderState,
            claudeCodeOptions: state.claudeCodeOptions ?? DEFAULT_CLAUDE_CODE_OPTIONS,
          };
        }

        return persisted as ModelSettingsState;
      },
      partialize: (state) => ({
        activeProvider: DEFAULT_PROVIDER_ID,
        providerState: state.providerState,
        claudeCodeOptions: state.claudeCodeOptions,
      }),
    },
  ),
);
