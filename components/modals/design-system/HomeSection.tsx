'use client';

import {
  Loader2,
  Download,
  CheckCircle2,
  GitCompare,
  Sparkles,
  FileText,
  Wand2,
  Bot,
  ChevronRight,
} from 'lucide-react';
import type { StatusResponse } from './cards';

type Section = 'home' | 'preview' | 'edit' | 'check' | 'history' | 'export' | 'spec';

export default function HomeSection({
  status,
  statusLoading,
  setupRunning,
  setupLog,
  onSetup,
  onScaffold,
  onGo,
  injectIntoGeneration,
  onToggleInject,
  aiRunning,
  aiLog,
  aiNotes,
  onAiNotes,
  onAiGenerate,
  providerLabel,
}: {
  status: StatusResponse | null;
  statusLoading: boolean;
  setupRunning: boolean;
  setupLog: string;
  onSetup: () => void;
  onScaffold: () => void;
  onGo: (s: Section) => void;
  injectIntoGeneration: boolean;
  onToggleInject: (v: boolean) => void;
  aiRunning: boolean;
  aiLog: string;
  aiNotes: string;
  onAiNotes: (v: string) => void;
  onAiGenerate: () => void;
  providerLabel: string;
}) {
  const ready = !!status?.installed && !!status?.fileExists;
  const installed = !!status?.installed;

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h2 className="text-xl font-semibold tracking-tight text-stone-900">
        {ready ? 'Your design system is ready' : "Let's set up your design system"}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
        {ready
          ? 'Edit your design system, run checks, and export it for code. Turn on AI generation to keep variations on-brand automatically.'
          : 'A design system is one shared place for your colors, fonts, spacing, and rules. We\'ll create one for you in a single click.'}
      </p>

      {!ready && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-stone-500">
              <Wand2 className="w-3.5 h-3.5" />
              Step 1 · One-click setup
            </div>
            <h3 className="mt-1.5 text-base font-semibold text-stone-900">
              Set up design system
            </h3>
            <p className="mt-1 text-[12.5px] text-stone-600 leading-relaxed">
              We&apos;ll install the tools and add helpful shortcuts to your project. Takes about 30 seconds.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={onSetup}
                disabled={setupRunning || statusLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50"
              >
                {setupRunning && <Loader2 className="w-4 h-4 animate-spin" />}
                {setupRunning ? 'Setting up…' : installed ? 'Re-run setup' : 'Set up design system'}
              </button>
            </div>
          </div>

          {setupLog && (
            <div className="border-t border-stone-200 bg-stone-50 px-5 py-3">
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-stone-500 mb-1.5">
                Setup log
              </div>
              <pre className="max-h-40 overflow-auto text-[11px] leading-relaxed font-mono text-stone-700 whitespace-pre-wrap">
                {setupLog}
              </pre>
            </div>
          )}
        </div>
      )}

      {installed && !status?.fileExists && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-amber-700">
              <Bot className="w-3.5 h-3.5" />
              Step 2 · Create your DESIGN.md
            </div>
            <h3 className="mt-1.5 text-base font-semibold text-stone-900">
              Let AI build it from your codebase
            </h3>
            <p className="mt-1 text-[12.5px] text-stone-700 leading-relaxed">
              The AI will read your Tailwind config, components, and styles to draft a{' '}
              <code className="font-mono text-[11px] bg-white/70 px-1 py-0.5 rounded">DESIGN.md</code>{' '}
              that matches what you already have. You can edit it afterward.
            </p>

            <div className="mt-3">
              <label className="text-[11px] font-medium text-stone-600 block mb-1">
                Anything specific to mention? <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={aiNotes}
                onChange={(e) => onAiNotes(e.target.value)}
                disabled={aiRunning}
                placeholder="e.g. We're a fintech with a calm, trustworthy feel. Primary brand color is teal."
                className="w-full min-h-[64px] p-2.5 text-[12px] leading-relaxed text-stone-800 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 resize-y placeholder:text-stone-400"
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onAiGenerate}
                disabled={aiRunning}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50"
              >
                {aiRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {aiRunning ? 'AI is working…' : 'Generate from my codebase'}
              </button>
              <button
                onClick={onScaffold}
                disabled={aiRunning}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Use blank starter
              </button>
              <span className="ml-auto text-[10.5px] text-stone-500">
                using {providerLabel}
              </span>
            </div>
          </div>

          {aiLog && (
            <div className="border-t border-amber-200/70 bg-white/60 px-5 py-3">
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-stone-500 mb-1.5">
                AI activity
              </div>
              <pre className="max-h-48 overflow-auto text-[11px] leading-relaxed font-mono text-stone-700 whitespace-pre-wrap">
                {aiLog}
              </pre>
            </div>
          )}
        </div>
      )}

      {ready && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ShortcutCard
              icon={FileText}
              title="Edit your design system"
              description="Update colors, fonts, and spacing."
              onClick={() => onGo('edit')}
            />
            <ShortcutCard
              icon={CheckCircle2}
              title="Check for issues"
              description="Find broken references and contrast problems."
              onClick={() => onGo('check')}
            />
            <ShortcutCard
              icon={GitCompare}
              title="See what you changed"
              description="Compare to your last saved version."
              onClick={() => onGo('history')}
            />
            <ShortcutCard
              icon={Download}
              title="Export to code"
              description="Tailwind theme or W3C tokens."
              onClick={() => onGo('export')}
            />
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-gradient-to-br from-amber-50/40 to-stone-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={injectIntoGeneration}
                onChange={(e) => onToggleInject(e.target.checked)}
                className="mt-0.5 rounded border-stone-300"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-stone-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Use in AI generation
                </div>
                <p className="mt-0.5 text-[12px] text-stone-600 leading-relaxed">
                  When you generate variations on the canvas, the AI will follow your design system automatically.
                </p>
              </div>
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function ShortcutCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm transition-all p-4"
    >
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 text-stone-500 group-hover:text-stone-700 transition-colors" />
        <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="mt-2.5 text-[13px] font-medium text-stone-900">{title}</div>
      <div className="mt-1 text-[11.5px] text-stone-500 leading-snug">{description}</div>
    </button>
  );
}
