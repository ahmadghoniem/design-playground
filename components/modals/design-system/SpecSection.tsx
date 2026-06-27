'use client';

import { useEffect } from 'react';
import { SectionShell, ResultCard, type CliResult } from './cards';

/** Spec section — auto-loads the format spec the first time it's installed. */
export default function SpecSection({
  running,
  result,
  installed,
  onRun,
}: {
  running: boolean;
  result: CliResult | null;
  installed: boolean;
  onRun: () => void;
}) {
  useEffect(() => {
    if (installed && !result && !running) {
      onRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed]);

  return (
    <SectionShell
      title="How design.md works"
      blurb="The format spec — what each section means and which fields are required. Helpful when teaching the AI about a custom design pattern."
    >
      <ResultCard result={result} successHint="Loading the spec…" />
    </SectionShell>
  );
}
