'use client';

/**
 * Shared utilities for the IterateDialog:
 *   - loadSelectedModel / saveSelectedModel (localStorage, provider-scoped)
 *   - useAvailableModels hook
 *
 * This file is the canonical home for these exports.
 * `nodes/shared/IterateDialogParts.tsx` re-exports everything from here
 * so existing import paths keep working.
 */

import { useEffect } from 'react';
import { SELECTED_MODEL_STORAGE_KEY } from '../../../lib/constants';
import { useModelSettingsStore } from '../../../stores/model-settings-store';
import { getProvider } from '../../../lib/providers/registry';
import { resolveAgentModel } from '../../../lib/resolve-agent-model';
import {
  migrateModelId,
  isModelEnabled,
  normalizeAutoModelId,
} from '../../../lib/model-catalog';
import type { ProviderId } from '../../../lib/providers/types';

// Re-export ModelOption for consumers
export type { ModelOption } from '../../../lib/constants';

// Build a provider-scoped localStorage key for the selected model
function selectedModelKey(): string {
  const { activeProvider } = useModelSettingsStore.getState();
  return `${SELECTED_MODEL_STORAGE_KEY}-${activeProvider}`;
}

// Load last selected model from localStorage (scoped to the active provider)
export function loadSelectedModel(): string {
  if (typeof window === 'undefined') return '';
  try {
    const { activeProvider } = useModelSettingsStore.getState();
    const providerKey = `${SELECTED_MODEL_STORAGE_KEY}-${activeProvider}`;

    // Try provider-scoped key first, fall back to legacy unscoped key
    let model = localStorage.getItem(providerKey) || '';
    if (!model) {
      model = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) || '';
    }

    const rawModel = model;
    model = migrateModelId(activeProvider as ProviderId, model);

    // Validate the model belongs to the active provider's enabled models
    if (model) {
      const config = getProvider(activeProvider);
      const ps = useModelSettingsStore.getState().providerState[activeProvider];
      const enabledModels = ps?.enabledModels?.length
        ? ps.enabledModels
        : config.defaultEnabledModels;
      if (!isModelEnabled(activeProvider as ProviderId, model, enabledModels)) {
        model = enabledModels[0] || '';
      }
    }

    if (model && model !== rawModel) {
      saveSelectedModel(model);
    }

    return resolveAgentModel(activeProvider as ProviderId, model) ?? model;
  } catch {
    return '';
  }
}

// Save selected model to localStorage (scoped to the active provider)
export function saveSelectedModel(model: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(selectedModelKey(), model);
    // Also write to legacy key for backward compat
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
  } catch (e) {
    console.error('[Models] Error saving selected model:', e);
  }
}

// ---------------------------------------------------------------------------
// useAvailableModels hook
// ---------------------------------------------------------------------------

export function useAvailableModels() {
  const hasHydrated = useModelSettingsStore((s) => s.hasHydrated);
  const activeProvider = useModelSettingsStore((s) => s.activeProvider);
  const providerState = useModelSettingsStore((s) => s.providerState[s.activeProvider]);
  const isLoading = useModelSettingsStore((s) => s.isLoadingModels);
  const fetchModels = useModelSettingsStore((s) => s.fetchModels);

  const availableModels = providerState?.availableModels ?? [];
  const enabledModels = providerState?.enabledModels ?? [];
  const hasFetched = providerState?.hasFetched ?? false;

  useEffect(() => {
    if (hasHydrated && !hasFetched) fetchModels();
  }, [hasHydrated, hasFetched, fetchModels]);

  // Filter by enabled models — fall back to provider defaults if empty
  const config = getProvider(activeProvider);
  const models = enabledModels.length === 0
    ? availableModels.filter((m) =>
        config.defaultEnabledModels.some((id) =>
          activeProvider === 'cursor'
            ? normalizeAutoModelId(id) === normalizeAutoModelId(m.value)
            : id === m.value,
        ),
      )
    : availableModels.filter((m) =>
        isModelEnabled(activeProvider, m.value, enabledModels),
      );

  return { models, allModels: availableModels, isLoading };
}
