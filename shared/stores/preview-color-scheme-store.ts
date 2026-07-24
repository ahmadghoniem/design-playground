import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Per-canvas color-scheme override for component previews.
 *
 *  - 'dark'  : force previews dark by adding `.dark` to the canvas root, so the
 *              host's own `.dark { ... }` token overrides apply to every preview
 *              regardless of the host's current mode. Guaranteed.
 *  - 'light' : best-effort force-light (adds `.light`). Reliable when the host
 *              is already light; when the host sets `.dark` on an ancestor it
 *              cannot be fully undone in pure CSS.
 */
export type PreviewColorScheme = 'light' | 'dark';

interface PreviewColorSchemeState {
  scheme: PreviewColorScheme;
  setScheme: (scheme: PreviewColorScheme) => void;
  toggle: () => void;
}

export const usePreviewColorSchemeStore = create<PreviewColorSchemeState>()(
  persist(
    (set) => ({
      scheme: 'light',
      setScheme: (scheme: PreviewColorScheme) => set({ scheme }),
      toggle: () =>
        set((state) => ({
          scheme: state.scheme === 'dark' ? 'light' : 'dark',
        })),
    }),
    {
      name: 'playground-preview-color-scheme',
    }
  )
);

/**
 * Class to add to the preview root (canvas `.playground-main-view`, or the
 * standalone `.app-theme` iteration view) for the active override.
 */
export function previewSchemeClass(scheme: PreviewColorScheme): string {
  return scheme === 'dark' ? 'dark' : 'light';
}
