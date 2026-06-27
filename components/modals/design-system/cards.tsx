'use client';

import { Loader2, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { tonalScale, readableTextColor } from '../../../lib/parse-design-md';

// ---------------------------------------------------------------------------
// Shared CLI/status types — re-used by the CLI hook and every section.
// ---------------------------------------------------------------------------

export interface StatusResponse {
  installed: boolean;
  packageVersion: string | null;
  fileExists: boolean;
  filePath: string;
  fileSize: number | null;
}

export interface CliResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
  format?: string;
}

// ---------------------------------------------------------------------------
// Sidebar status badge
// ---------------------------------------------------------------------------

export function ReadyBadge({ status, loading }: { status: StatusResponse | null; loading: boolean }) {
  const ready = !!status?.installed && !!status?.fileExists;
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-stone-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="font-medium">Checking…</span>
      </div>
    );
  }
  if (ready) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-emerald-700">
        <CheckCircle2 className="w-[15px] h-[15px]" strokeWidth={2.25} />
        <span className="font-medium">Ready to use</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-amber-700">
      <AlertCircle className="w-[15px] h-[15px]" strokeWidth={2.25} />
      <span className="font-medium">Not set up yet</span>
    </div>
  );
}

export function Switch({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-[18px] w-[30px] flex-shrink-0 items-center rounded-full transition-colors ${
        disabled
          ? 'bg-stone-200'
          : checked
          ? 'bg-stone-900'
          : 'bg-stone-300'
      }`}
      aria-hidden
    >
      <span
        className={`inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
        }`}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared shell
// ---------------------------------------------------------------------------

export function SectionShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-7 max-w-3xl">
      <h2 className="text-lg font-semibold tracking-tight text-stone-900">{title}</h2>
      <p className="mt-1.5 text-[12.5px] text-stone-600 leading-relaxed max-w-xl">{blurb}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result card — friendly result rendering
// ---------------------------------------------------------------------------

export function ResultCard({ result, successHint }: { result: CliResult | null; successHint?: string }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-5 text-center">
        <p className="text-[12px] text-stone-500">{successHint ?? 'Run an action to see results here.'}</p>
      </div>
    );
  }
  if (result.error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-amber-900">Heads up</div>
            <p className="mt-0.5 text-[12px] text-amber-800 leading-relaxed">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }
  const output = result.stdout || result.stderr || '';
  const isClean = result.ok && output.trim().length === 0;
  if (isClean) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[12.5px] font-medium text-emerald-900">All good</div>
            <p className="mt-0.5 text-[12px] text-emerald-800 leading-relaxed">
              {successHint ?? 'No issues found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
        result.ok ? 'border-stone-200' : 'border-rose-200'
      }`}
    >
      <div
        className={`px-4 py-2 text-[10.5px] font-medium uppercase tracking-wider flex items-center justify-between ${
          result.ok ? 'bg-stone-50 text-stone-500' : 'bg-rose-50 text-rose-700'
        }`}
      >
        <span>{result.ok ? 'Output' : 'Issues found'}</span>
        {result.exitCode !== null && result.exitCode !== 0 && (
          <span className="font-mono normal-case text-[10px]">
            exit {result.exitCode}
          </span>
        )}
      </div>
      <pre className="max-h-[340px] overflow-auto p-4 text-[11.5px] leading-relaxed font-mono text-stone-800 whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export format card
// ---------------------------------------------------------------------------

export function FormatCard({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-3.5 transition-all ${
        active
          ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">{label}</span>
        {active && <Check className="w-3.5 h-3.5" />}
      </div>
      <div className={`mt-1 text-[11px] ${active ? 'text-stone-300' : 'text-stone-500'}`}>
        {description}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Preview cards — color/typography/showcase tiles used by PreviewSection
// ---------------------------------------------------------------------------

export function ColorCard({ name, hex }: { name: string; hex: string }) {
  const text = readableTextColor(hex);
  const scale = tonalScale(hex);
  return (
    <div
      className="rounded-2xl overflow-hidden border border-stone-200/60 shadow-sm"
      style={{ background: hex }}
    >
      <div className="flex items-start justify-between px-4 pt-3.5 pb-3" style={{ color: text }}>
        <span className="text-[13px] font-semibold capitalize">{name.replace(/-/g, ' ')}</span>
        <span className="text-[11.5px] font-mono tracking-tight opacity-90">
          {hex.toUpperCase()}
        </span>
      </div>
      <div className="h-12" style={{ background: hex }} />
      <div className="flex h-7">
        {scale.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

export function TypographyCard({
  label,
  font,
  surface,
  serif,
}: {
  label: string;
  font: string;
  surface: string;
  serif?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-stone-200/40 px-4 pt-3.5 pb-2 flex flex-col"
      style={{ background: surface, minHeight: 170 }}
    >
      <div className="flex items-center justify-between text-stone-500">
        <span className="text-[12px]">{label}</span>
        <span className="text-[12px]">{font.split(',')[0].replace(/['"]/g, '').trim()}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span
          className="text-stone-900 leading-none"
          style={{
            fontFamily: serif ? `"${font.split(',')[0].replace(/['"]/g, '')}", serif` : `"${font.split(',')[0].replace(/['"]/g, '')}", sans-serif`,
            fontSize: 96,
            fontWeight: serif ? 500 : 400,
          }}
        >
          Aa
        </span>
      </div>
    </div>
  );
}

export function ShowcaseCard({
  children,
  surface,
  compact,
}: {
  children: React.ReactNode;
  surface: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/40 flex items-center justify-center ${
        compact ? 'px-3 py-3' : 'px-4 py-4'
      }`}
      style={{ background: surface, minHeight: compact ? 78 : 96 }}
    >
      <div className="w-full">{children}</div>
    </div>
  );
}

export function PreviewButton({
  label,
  bg,
  text,
  rounded,
  muted,
  outlined,
  borderColor,
}: {
  label: string;
  bg: string;
  text: string;
  rounded?: string;
  muted?: boolean;
  outlined?: boolean;
  borderColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-center text-[12.5px] font-medium"
      style={{
        background: bg,
        color: text,
        borderRadius: rounded || '8px',
        height: 36,
        border: outlined && borderColor ? `1px solid ${borderColor}` : muted ? '1px solid rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {label}
    </div>
  );
}

export function CircleIcon({
  bg,
  text,
  icon: Icon,
}: {
  bg: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ background: bg, color: text, width: 36, height: 36, borderRadius: 999 }}
    >
      <Icon className="w-4 h-4" />
    </div>
  );
}
