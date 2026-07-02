import { Loader2, Check, RotateCcw } from "lucide-react";
import { SectionShell } from "./cards";

export default function EditSection({
  content,
  loading,
  saving,
  dirty,
  fileExists,
  onChange,
  onSave,
  onScaffold,
  onReload,
  aiRunning,
  aiLog,
  onAiRegenerate,
}: {
  content: string;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  fileExists: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  onScaffold: () => void;
  onReload: () => void;
  aiRunning: boolean;
  aiLog: string;
  onAiRegenerate: () => void;
}) {
  if (!fileExists && !loading) {
    return (
      <SectionShell
        title="Edit your design system"
        blurb="No design system file yet — create one to get started."
      >
        <button
          onClick={onScaffold}
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors"
        >
          Create starter file
        </button>
      </SectionShell>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-7 pb-3 border-b border-stone-200/60 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">
            Edit your design system
          </h2>
          <p className="mt-1 text-[12.5px] text-stone-600 leading-relaxed">
            Tokens (colors, fonts, spacing) live in the{" "}
            <code className="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">
              ---
            </code>{" "}
            block at the top. Below it, write notes in plain English.
          </p>
        </div>
        <button
          onClick={onAiRegenerate}
          disabled={aiRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 hover:border-stone-300 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          title="Ask AI to rewrite DESIGN.md from your current codebase"
        >
          {aiRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          Regenerate with AI
        </button>
      </div>

      {aiLog && aiRunning && (
        <div className="px-8 py-2 border-b border-stone-200/60 bg-amber-50/60">
          <pre className="max-h-24 overflow-auto text-[10.5px] leading-relaxed font-mono text-stone-700 whitespace-pre-wrap">
            {aiLog}
          </pre>
        </div>
      )}

      <div className="flex-1 min-h-0 px-8 pt-4 pb-3">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          disabled={loading}
          className="w-full h-full min-h-[340px] p-4 text-[12.5px] leading-relaxed font-mono text-stone-800 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-300/60 resize-none shadow-sm"
        />
      </div>

      <div className="px-8 py-3 border-t border-stone-200/60 bg-stone-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11.5px]">
          {loading ? (
            <span className="text-stone-400 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </span>
          ) : dirty ? (
            <span className="text-amber-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          ) : (
            <span className="text-stone-500 flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-600" /> All changes saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReload}
            disabled={loading || saving}
            className="px-3 py-1.5 text-[12px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={onSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
