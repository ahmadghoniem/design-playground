import { Maximize, Monitor, Smartphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import type { ComponentSize } from "@pg/shared/lib/constants";

/** Icon-only preview viewport switcher: Auto · Desktop · Mobile */
export function ViewportButtons({
  currentSize,
  onSizeChange,
}: {
  currentSize: ComponentSize;
  onSizeChange: (size: ComponentSize) => void;
}) {
  const sizes: { key: ComponentSize; icon: React.ReactNode; label: string }[] =
    [
      {
        key: "default",
        label: "Auto",
        icon: <Maximize width={13} height={13} strokeWidth={2} />,
      },
      {
        key: "laptop",
        label: "Desktop",
        icon: <Monitor className="w-3 h-3" />,
      },
      {
        key: "mobile",
        label: "Mobile",
        icon: <Smartphone className="w-3 h-3" />,
      },
    ];

  return (
    <div className="flex items-center gap-0.5">
      {sizes.map(({ key, icon, label }) => (
        <Tooltip key={key}>
          <TooltipTrigger
            render={
              <button
                onClick={() => onSizeChange(key)}
                className={`p-1 rounded transition-colors ${
                  currentSize === key
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
