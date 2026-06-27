'use client';

import { Loader2 } from 'lucide-react';
import { SectionShell, ResultCard, type CliResult } from './cards';

/** Generic action section — shared by Check and History. */
export default function ActionSection({
  title,
  blurb,
  actionLabel,
  running,
  result,
  onRun,
  installed,
  successHint,
}: {
  title: string;
  blurb: string;
  actionLabel: string;
  running: boolean;
  result: CliResult | null;
  onRun: () => void;
  installed: boolean;
  successHint: string;
}) {
  return (
    <SectionShell title={title} blurb={blurb}>
      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={running || !installed}
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50"
        >
          {running && <Loader2 className="w-4 h-4 animate-spin" />}
          {running ? 'Working…' : actionLabel}
        </button>
        {result && !running && (
          <span className="text-[11.5px] text-stone-500">
            Re-run anytime to refresh.
          </span>
        )}
      </div>

      <div className="mt-5">
        <ResultCard result={result} successHint={successHint} />
      </div>
    </SectionShell>
  );
}
