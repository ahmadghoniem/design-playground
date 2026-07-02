import { useState, useEffect, useRef, useCallback } from "react";
import {
  Eraser,
  RefreshCw,
  SlidersVertical,
  Keyboard,
  ChevronDown,
  Copy,
  Wrench,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { usePreviewColorSchemeStore } from "../stores/preview-color-scheme-store";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  CANVAS_BACKGROUND_COLOR,
  OPEN_SKILLS_CATALOG_EVENT,
  ITERATION_FETCH_EVENT,
  PLAYGROUND_CLEAR_EVENT,
} from "../lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import ModelSettingsModal from "../components/modals/ModelSettingsModal";
import KeyboardShortcutsModal from "../components/modals/KeyboardShortcutsModal";
import { useOpenIn, type OpenInTarget } from "../hooks/useOpenIn";
import { useProjectContext } from "../hooks/useProjectContext";

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
  const previewScheme = usePreviewColorSchemeStore((s) => s.scheme);
  const cyclePreviewScheme = usePreviewColorSchemeStore((s) => s.cycle);
  const projectContext = useProjectContext();
  const {
    targets,
    labels: TARGET_LABELS,
    icons,
    defaultTarget,
    openIn,
  } = useOpenIn();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent(ITERATION_FETCH_EVENT));
  };

  const handleClear = () => {
    window.dispatchEvent(new CustomEvent(PLAYGROUND_CLEAR_EVENT));
  };

  const handleOpenTarget = useCallback(
    async (target: OpenInTarget, makeDefault = false) => {
      await openIn(target, makeDefault);
      setProjectMenuOpen(false);
    },
    [openIn],
  );

  const handleCopyPath = useCallback(async () => {
    if (!projectContext.projectPath) return;
    try {
      await navigator.clipboard.writeText(projectContext.projectPath);
      setPathCopied(true);
      if (copyFeedbackTimerRef.current)
        clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = setTimeout(
        () => setPathCopied(false),
        1200,
      );
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

        {/* Right: action icons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cyclePreviewScheme}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                aria-label="Preview color scheme"
              >
                {previewScheme === "dark" ? (
                  <Moon className="w-[18px] h-[18px]" />
                ) : previewScheme === "light" ? (
                  <Sun className="w-[18px] h-[18px]" />
                ) : (
                  <Monitor className="w-[18px] h-[18px]" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>
                Preview theme:{" "}
                {previewScheme === "auto"
                  ? "Auto (match app)"
                  : previewScheme === "dark"
                    ? "Dark"
                    : "Light"}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent(OPEN_SKILLS_CATALOG_EVENT),
                  )
                }
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
              <DropdownMenu
                open={projectMenuOpen}
                onOpenChange={setProjectMenuOpen}
              >
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
                      <img
                        src={icon}
                        alt=""
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
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
                    <span>{pathCopied ? "Copied!" : "Copy path"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <ModelSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </TooltipProvider>
  );
}
