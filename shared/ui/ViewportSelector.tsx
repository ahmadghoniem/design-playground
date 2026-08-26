import { Maximize, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import { VIEWPORT_PRESETS, type Viewport } from "@pg/shared/lib/constants";

/** Icons only — labels come from VIEWPORT_PRESETS so there is one source. */
const VIEWPORT_ICONS: Record<Viewport, React.ReactNode> = {
  default: <Maximize width={13} height={13} strokeWidth={2} />,
  laptop: <Monitor className="size-3" />,
  tablet: <Tablet className="size-3" />,
  mobile: <Smartphone className="size-3" />,
};

/** Widest first, so the row reads as a size ramp. */
const VIEWPORT_ORDER: Viewport[] = ["default", "laptop", "tablet", "mobile"];

/** Icon-only preview viewport switcher: Auto · Desktop · Tablet · Mobile */
export function ViewportSelector({
  viewport,
  onViewportChange,
}: {
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {VIEWPORT_ORDER.map((key) => {
        const { label } = VIEWPORT_PRESETS[key];
        return (
          <Tooltip key={key}>
            <TooltipTrigger
              render={
                <button
                  onClick={() => onViewportChange(key)}
                  className={`p-1 rounded transition-colors ${
                    viewport === key
                      ? "text-[#0B99FF] bg-blue-50"
                      : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  }`}
                  aria-label={label}
                />
              }
            >
              {VIEWPORT_ICONS[key]}
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
