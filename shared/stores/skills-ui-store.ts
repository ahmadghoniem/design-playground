import { create } from "zustand";

/**
 * Cross-shell skills UI state: open-catalog and skills-changed. Both ends can
 * reach React, so a store is enough.
 */
interface SkillsUiState {
  catalogOpen: boolean;
  openCatalog: () => void;
  closeCatalog: () => void;
  setCatalogOpen: (open: boolean) => void;
  /** Bumped when builtin/user skills are mutated so chat hooks refetch. */
  skillsVersion: number;
  bumpSkillsVersion: () => void;
}

export const useSkillsUiStore = create<SkillsUiState>((set) => ({
  catalogOpen: false,
  openCatalog: () => set({ catalogOpen: true }),
  closeCatalog: () => set({ catalogOpen: false }),
  setCatalogOpen: (open) => set({ catalogOpen: open }),
  skillsVersion: 0,
  bumpSkillsVersion: () =>
    set((s) => ({ skillsVersion: s.skillsVersion + 1 })),
}));
