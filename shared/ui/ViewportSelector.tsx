import { Maximize, Monitor, Smartphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import type { Viewport } from "@pg/shared/lib/constants";

/** Icon-only preview viewport switcher: Auto · Desktop · Mobile */
export function ViewportSelector({
  viewport,
  onViewportChange,
}: {
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
}) {
  const options: { key: Viewport; icon: React.ReactNode; label: string }[] =
    [
      {
        key: "default",
        label: "Auto",
        icon: <Maximize width={13} height={13} strokeWidth={2} />,
      },
      {
        key: "laptop",
        label: "Desktop",
        icon: <Monitor className="size-3" />,
      },
      {
        key: "mobile",
        label: "Mobile",
        icon: <Smartphone className="size-3" />,
      },
    ];

  return (
    <div className="flex items-center gap-0.5">
      {options.map(({ key, icon, label }) => (
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
            {icon}
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
