'use client';

import { useCallback, useState } from 'react';
import cursorIcon from '../assets/cursor-icon.svg';
import finderIcon from '../assets/finder-icon.png';
import githubDesktopIcon from '../assets/github-desktop-icon.png';
import antigravityIcon from '../assets/antigravity-icon.png';
import codexIcon from '../assets/codex-icon.png';

// ---------------------------------------------------------------------------
// useOpenIn
// ---------------------------------------------------------------------------
// The "Open in …" launcher: the target list (with icon + label), the
// persisted default target, and the POST to /playground/api/open-in that
// actually launches the chosen app. Persistence is a plain localStorage
// key (OPEN_IN_DEFAULT_KEY) — callers never touch storage directly.
// ---------------------------------------------------------------------------

export type OpenInTarget = 'finder' | 'cursor' | 'antigravity' | 'codex' | 'github-desktop';

export interface OpenInTargetInfo {
  target: OpenInTarget;
  label: string;
  icon: string;
}

const OPEN_IN_DEFAULT_KEY = 'playground-open-in-default';

const TARGET_LABELS: Record<OpenInTarget, string> = {
  cursor: 'Cursor',
  finder: 'Finder',
  antigravity: 'Antigravity',
  codex: 'Codex',
  'github-desktop': 'GitHub Desktop',
};

const ICON_SRC = (icon: unknown) =>
  (icon as { src?: string }).src ?? (icon as string);

const TARGET_ICONS: Record<OpenInTarget, string> = {
  cursor: ICON_SRC(cursorIcon),
  finder: ICON_SRC(finderIcon),
  antigravity: ICON_SRC(antigravityIcon),
  codex: ICON_SRC(codexIcon),
  'github-desktop': ICON_SRC(githubDesktopIcon),
};

const TARGET_ORDER: OpenInTarget[] = ['cursor', 'finder', 'antigravity', 'codex', 'github-desktop'];

export const OPEN_IN_TARGETS: OpenInTargetInfo[] = TARGET_ORDER.map((target) => ({
  target,
  label: TARGET_LABELS[target],
  icon: TARGET_ICONS[target],
}));

function loadStoredDefault(): OpenInTarget {
  if (typeof window === 'undefined') return 'cursor';
  const stored = localStorage.getItem(OPEN_IN_DEFAULT_KEY) as OpenInTarget | null;
  return stored ?? 'cursor';
}

export interface UseOpenInReturn {
  targets: OpenInTargetInfo[];
  labels: Record<OpenInTarget, string>;
  icons: Record<OpenInTarget, string>;
  defaultTarget: OpenInTarget;
  setDefault: (target: OpenInTarget) => void;
  /** Launches `target` via /playground/api/open-in. Pass makeDefault to also persist it. */
  openIn: (target: OpenInTarget, makeDefault?: boolean) => Promise<void>;
}

export function useOpenIn(): UseOpenInReturn {
  const [defaultTarget, setDefaultTargetState] = useState<OpenInTarget>(loadStoredDefault);

  const setDefault = useCallback((target: OpenInTarget) => {
    setDefaultTargetState(target);
    try {
      localStorage.setItem(OPEN_IN_DEFAULT_KEY, target);
    } catch {
      // Ignore — persistence is best effort.
    }
  }, []);

  const openIn = useCallback(async (target: OpenInTarget, makeDefault = false) => {
    if (makeDefault) setDefault(target);
    try {
      await fetch('/playground/api/open-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
    } catch {
      // Ignore for now — this action is best effort.
    }
  }, [setDefault]);

  return { targets: OPEN_IN_TARGETS, labels: TARGET_LABELS, icons: TARGET_ICONS, defaultTarget, setDefault, openIn };
}
