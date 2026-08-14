import { useState } from "react";
import { SlidersVertical, Wrench, Sun, Moon } from "lucide-react";
import { usePreviewColorSchemeStore } from "@pg/shared/stores/preview-color-scheme-store";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import { useSkillsUiStore } from "@pg/shared/stores/skills-ui-store";
import ModelSettingsModal from "@pg/app/ModelSettingsModal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlaygroundHeaderProps {
  projectName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlaygroundHeader({
  projectName,
}: PlaygroundHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSkillsCatalog = useSkillsUiStore((s) => s.openCatalog);
  const previewScheme = usePreviewColorSchemeStore((s) => s.scheme);
  const togglePreviewScheme = usePreviewColorSchemeStore((s) => s.toggle);

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between px-4 h-12 bg-pg-canvas flex-shrink-0">
        {/* Left: project name label */}
        <div className="flex items-center">
          <span className="text-sm font-medium text-stone-500 tracking-tight select-none">
            /{projectName}
          </span>
        </div>

        {/* Right: action icons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={togglePreviewScheme}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                aria-label="Preview color scheme"
              >
                {previewScheme === "dark" ? (
                  <Moon className="w-[18px] h-[18px]" />
                ) : (
                  <Sun className="w-[18px] h-[18px]" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>
                Preview theme: {previewScheme === "dark" ? "Dark" : "Light"}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openSkillsCatalog}
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
        </div>
      </header>

      <ModelSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </TooltipProvider>
  );
}
