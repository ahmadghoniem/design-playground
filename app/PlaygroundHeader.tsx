'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, RefreshCw, SlidersVertical, Keyboard, ChevronDown, Copy, Wrench, Sun, Moon, Monitor } from 'lucide-react';
import { useDevModeStore } from '../stores/dev-mode-store';
import { usePreviewColorSchemeStore } from '../stores/preview-color-scheme-store';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CANVAS_BACKGROUND_COLOR, OPEN_SKILLS_CATALOG_EVENT, ITERATION_FETCH_EVENT, PLAYGROUND_CLEAR_EVENT } from '../lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../lib/utils';
import ModelSettingsModal from '../components/modals/ModelSettingsModal';
import KeyboardShortcutsModal from '../components/modals/KeyboardShortcutsModal';
import PlaygroundHeaderPresence from '../components/canvas/PlaygroundHeaderPresence';
import { useOpenIn, type OpenInTarget } from '../hooks/useOpenIn';
import { useProjectContext } from '../hooks/useProjectContext';
import { usePresenceBubbles } from '../hooks/usePresenceBubbles';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlaygroundHeaderProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlaygroundHeader({
  sidebarVisible: _sidebarVisible,
  onToggleSidebar: _onToggleSidebar,
}: PlaygroundHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [devModeMenu, setDevModeMenu] = useState<{ x: number; y: number } | null>(null);
  const devMode = useDevModeStore((s) => s.enabled);
  const toggleDevMode = useDevModeStore((s) => s.toggle);
  const previewScheme = usePreviewColorSchemeStore((s) => s.scheme);
  const cyclePreviewScheme = usePreviewColorSchemeStore((s) => s.cycle);
  const { bubbles: presenceBubbles, handleBubbleClick, handleBubbleRemove } = usePresenceBubbles();
  const projectContext = useProjectContext();
  const { targets, labels: TARGET_LABELS, icons, defaultTarget, openIn } = useOpenIn();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!devModeMenu) return;
    const handleClick = () => setDevModeMenu(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDevModeMenu(null); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [devModeMenu]);

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent(ITERATION_FETCH_EVENT));
  };

  const handleClear = () => {
    window.dispatchEvent(new CustomEvent(PLAYGROUND_CLEAR_EVENT));
  };

  const handleOpenTarget = useCallback(async (target: OpenInTarget, makeDefault = false) => {
    await openIn(target, makeDefault);
    setProjectMenuOpen(false);
  }, [openIn]);

  const handleCopyPath = useCallback(async () => {
    if (!projectContext.projectPath) return;
    try {
      await navigator.clipboard.writeText(projectContext.projectPath);
      setPathCopied(true);
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = setTimeout(() => setPathCopied(false), 1200);
    } catch {
      // Ignore copy failures to avoid interrupting flow.
    } finally {
      setProjectMenuOpen(false);
    }
  }, [projectContext.projectPath]);

  return (
    <TooltipProvider>
      <header
        className="flex items-center justify-between px-4 h-12 bg-gradient-to-b from-[CANVAS_BACKGROUND_COLOR] to-transparent flex-shrink-0"
        style={{
          backgroundColor: CANVAS_BACKGROUND_COLOR,
        }}
      >
        {/* Left: project name label */}
        <div className="flex items-center">
          <span className="text-sm font-medium text-stone-500 tracking-tight select-none">
            /{projectContext.projectName}
          </span>
        </div>

        {/* Right: action icons + presence bubbles */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cyclePreviewScheme}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                aria-label="Preview color scheme"
              >
                {previewScheme === 'dark' ? (
                  <Moon className="w-[18px] h-[18px]" />
                ) : previewScheme === 'light' ? (
                  <Sun className="w-[18px] h-[18px]" />
                ) : (
                  <Monitor className="w-[18px] h-[18px]" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>
                Preview theme:{' '}
                {previewScheme === 'auto'
                  ? 'Auto (match app)'
                  : previewScheme === 'dark'
                    ? 'Dark'
                    : 'Light'}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SKILLS_CATALOG_EVENT))}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                aria-label="Skills"
              >
                <Wrench className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Skills</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShortcutsOpen(true)}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Keyboard shortcuts</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSettingsOpen(true)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const MENU_WIDTH = 180;
                  const MENU_HEIGHT = 44;
                  const PADDING = 8;
                  const x = Math.min(e.clientX, window.innerWidth - MENU_WIDTH - PADDING);
                  const y = Math.min(e.clientY, window.innerHeight - MENU_HEIGHT - PADDING);
                  setDevModeMenu({ x, y });
                }}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                aria-label="Model settings"
              >
                <SlidersVertical className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Model settings</p>
            </TooltipContent>
          </Tooltip>

          {devMode && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleClear}
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                    aria-label="Clear all"
                  >
                    <Eraser className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Clear all</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRefresh}
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                    aria-label="Refresh variations"
                  >
                    <RefreshCw className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Refresh variations</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Split open-in button — far right */}
          <div className="flex items-center ml-1.5">
            <div className="flex items-center rounded-2xl border border-stone-200 bg-white overflow-hidden">
              {/* Default app: click to open immediately */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleOpenTarget(defaultTarget)}
                    className="flex items-center justify-center w-9 h-9 hover:bg-stone-50 transition-colors"
                    aria-label={`Open in ${TARGET_LABELS[defaultTarget]}`}
                  >
                    <img
                      src={icons[defaultTarget]}
                      alt={TARGET_LABELS[defaultTarget]}
                      width={18}
                      height={18}
                      className="rounded-sm"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>Open in {TARGET_LABELS[defaultTarget]}</p>
                </TooltipContent>
              </Tooltip>

              {/* Divider */}
              <div className="w-px h-4 bg-stone-200 shrink-0" />

              {/* Chevron: opens picker dropdown */}
              <DropdownMenu open={projectMenuOpen} onOpenChange={setProjectMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center w-7 h-9 hover:bg-stone-50 transition-colors"
                    aria-label="Choose app to open in"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  className="w-48 rounded-2xl border border-stone-200 bg-white/95 p-1.5 shadow-[0_12px_24px_rgba(28,25,23,0.12)] backdrop-blur-sm"
                >
                  {targets.map(({ target, icon, label }) => (
                    <DropdownMenuItem
                      key={target}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-mono text-stone-700 cursor-pointer"
                      onSelect={() => handleOpenTarget(target, true)}
                    >
                      <img src={icon} alt="" width={16} height={16} className="rounded-sm" />
                      <span className="flex-1">{label}</span>
                      {defaultTarget === target && (
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <div className="my-1 h-px bg-stone-100" />
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-mono text-stone-700 cursor-pointer"
                    onSelect={handleCopyPath}
                  >
                    <Copy className="h-4 w-4 text-stone-400" />
                    <span>{pathCopied ? 'Copied!' : 'Copy path'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Presence bubbles — stacked, active leftmost on top */}
          <PlaygroundHeaderPresence
            bubbles={presenceBubbles}
            onBubbleClick={handleBubbleClick}
            onBubbleRemove={handleBubbleRemove}
          />
        </div>
      </header>

      <ModelSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {devModeMenu && createPortal(
        <div
          className="fixed z-50 min-w-[180px] bg-white border border-stone-200 rounded-2xl shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: devModeMenu.y, left: devModeMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              toggleDevMode();
              setDevModeMenu(null);
            }}
            className="flex items-center justify-between gap-3 w-full px-3 py-1.5 text-[13px] text-stone-700 hover:bg-stone-100 transition-colors text-left rounded-xl"
          >
            <span>Dev mode</span>
            <span
              className={cn(
                'relative inline-flex h-[16px] w-[28px] items-center rounded-full transition-colors',
                devMode ? 'bg-stone-800' : 'bg-stone-300',
              )}
            >
              <span
                className={cn(
                  'inline-block h-[12px] w-[12px] rounded-full bg-white shadow transition-transform',
                  devMode ? 'translate-x-[14px]' : 'translate-x-[2px]',
                )}
              />
            </span>
          </button>
        </div>,
        document.body,
      )}
    </TooltipProvider>
  );
}
