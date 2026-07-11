import { useState } from "react";
import {
  Eraser,
  RefreshCw,
  SlidersVertical,
  Wrench,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { usePreviewColorSchemeStore } from "@pg/shared/stores/preview-color-scheme-store";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import {
  CANVAS_BACKGROUND_COLOR,
  OPEN_SKILLS_CATALOG_EVENT,
  ITERATION_FETCH_EVENT,
  PLAYGROUND_CLEAR_EVENT,
} from "@pg/shared/lib/constants";
import ModelSettingsModal from "@pg/app/ModelSettingsModal";
import { useProjectContext } from "@pg/app/useProjectContext";

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
  const previewScheme = usePreviewColorSchemeStore((s) => s.scheme);
  const cyclePreviewScheme = usePreviewColorSchemeStore((s) => s.cycle);
  const projectContext = useProjectContext();

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent(ITERATION_FETCH_EVENT));
  };

  const handleClear = () => {
    window.dispatchEvent(new CustomEvent(PLAYGROUND_CLEAR_EVENT));
  };

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
        </div>
      </header>

      <ModelSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </TooltipProvider>
  );
}
