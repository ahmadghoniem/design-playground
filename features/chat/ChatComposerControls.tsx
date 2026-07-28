import {
  EditIcon,
  ExploreIcon,
} from "@pg/shared/ui/playground-nav-icons";
import { IterationCountDragger } from "@pg/features/chat/chat-bits";

export type ChatComposerMode = "edit" | "explore" | "raw";

export interface ChatComposerControlsProps {
  /** Short label for the active model (shown next to the bubble). */
  shortModelName: string;
  onCycleModel: () => void;
  /** When true, render the Edit / Explore cluster (requires a selection). */
  showModeToggle: boolean;
  effectiveChatMode: ChatComposerMode;
  onChatModeChange: (mode: "edit" | "explore") => void;
  iterationCount: number;
  onIterationCountChange: (count: number) => void;
}

/**
 * Floating chrome above the docked chat pill: model bubble + short name on the
 * left, and (when a selection is present) the Edit / Explore toggle with the
 * variation-count dragger on the right.
 */
export function ChatComposerControls({
  shortModelName,
  onCycleModel,
  showModeToggle,
  effectiveChatMode,
  onChatModeChange,
  iterationCount,
  onIterationCountChange,
}: ChatComposerControlsProps) {
  return (
    <>
      <div
        className="absolute left-1.5 flex items-center gap-1.5"
        style={{ bottom: "calc(100% + 10px)" }}
      >
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCycleModel}
          className="chat-bubble inline-block border-0 bg-transparent p-0"
          style={{ width: 16, height: 16 }}
        >
          <span className="claude-agent-mark" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCycleModel}
          aria-label="Switch model"
          title="Switch model"
          className="select-none whitespace-nowrap text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-600"
        >
          {shortModelName}
        </button>
      </div>

      {showModeToggle && (
        <div
          className="absolute right-1.5 inline-flex items-center gap-0.5 rounded-full border border-stone-200/70 bg-white/95 px-0.5 py-0.5 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)] backdrop-blur"
          style={{ bottom: "calc(100% + 10px)" }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChatModeChange("edit")}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              effectiveChatMode === "edit"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-500 hover:text-stone-800"
            }`}
            aria-pressed={effectiveChatMode === "edit"}
            title="Edit design"
          >
            <EditIcon className="flex-shrink-0" />
            <span>Edit</span>
          </button>
          <div
            className={`inline-flex items-center gap-1 rounded-full transition-colors ${
              effectiveChatMode === "explore" ? "bg-stone-100 pr-1" : ""
            }`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChatModeChange("explore")}
              className={`inline-flex items-center gap-1 rounded-full pl-2.5 text-[11px] font-medium transition-colors ${
                effectiveChatMode === "explore"
                  ? "py-1 pr-0 text-stone-900"
                  : "py-1 pr-2.5 text-stone-500 hover:text-stone-800"
              }`}
              aria-pressed={effectiveChatMode === "explore"}
              title="Explore"
            >
              <ExploreIcon className="flex-shrink-0" />
              <span>Explore</span>
            </button>
            {effectiveChatMode === "explore" && (
              <IterationCountDragger
                count={iterationCount}
                onChange={onIterationCountChange}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
