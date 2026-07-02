import { useCallback, useEffect, useState } from "react";
import {
  Download,
  CheckCircle2,
  GitCompare,
  BookOpen,
  FileText,
  Palette,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { useDesignSystemStore } from "../../stores/design-system-store";
import { useModelSettingsStore } from "../../stores/model-settings-store";
import { getProvider } from "../../lib/providers/registry";
import {
  resolveToken,
  type ParsedDesignSystem,
} from "../../lib/parse-design-md";
import { useDesignSystemCli } from "./design-system/useDesignSystemCli";
import { ReadyBadge, Switch } from "./design-system/cards";
import HomeSection from "./design-system/HomeSection";
import PreviewSection from "./design-system/PreviewSection";
import EditSection from "./design-system/EditSection";
import ActionSection from "./design-system/ActionSection";
import ExportSection from "./design-system/ExportSection";
import SpecSection from "./design-system/SpecSection";

type Section =
  "home" | "preview" | "edit" | "check" | "history" | "export" | "spec";

interface DesignSystemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavItem {
  id: Section;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  {
    id: "preview",
    label: "Preview",
    description: "See your design system",
    icon: LayoutGrid,
  },
  {
    id: "edit",
    label: "Edit",
    description: "Update your design system",
    icon: FileText,
  },
  {
    id: "check",
    label: "Check",
    description: "Find issues automatically",
    icon: CheckCircle2,
  },
  {
    id: "history",
    label: "Changes",
    description: "See what you changed",
    icon: GitCompare,
  },
];

const SECONDARY_NAV: NavItem[] = [
  { id: "export", label: "Export code", icon: Download },
  { id: "spec", label: "How it works", icon: BookOpen },
];

export default function DesignSystemModal({
  open,
  onOpenChange,
}: DesignSystemModalProps) {
  const [section, setSection] = useState<Section>("home");
  const [aiNotes, setAiNotes] = useState("");

  const injectIntoGeneration = useDesignSystemStore(
    (s) => s.injectIntoGeneration,
  );
  const setInjectIntoGeneration = useDesignSystemStore(
    (s) => s.setInjectIntoGeneration,
  );
  const activeProvider = useModelSettingsStore((s) => s.activeProvider);
  const enabledModels = useModelSettingsStore(
    (s) => s.providerState[s.activeProvider]?.enabledModels ?? [],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const value = injectIntoGeneration ? "1" : "0";
    document.cookie = `pg-design-inject=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [injectIntoGeneration]);

  const cli = useDesignSystemCli(open);
  const {
    status,
    statusLoading,
    fileContent,
    fileLoading,
    loadFile,
    scaffoldOnly,
  } = cli;

  const ready = !!status?.installed && !!status?.fileExists;

  // When the user isn't set up yet, force Home (onboarding). When ready,
  // promote them to Preview the first time we know.
  useEffect(() => {
    if (!status) return;
    if (!ready) setSection("home");
    else if (section === "home") setSection("preview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, statusLoading]);

  const generateFromCodebase = useCallback(
    () =>
      cli.generateFromCodebase({
        provider: activeProvider,
        model: enabledModels[0],
        notes: aiNotes,
      }),
    [cli, activeProvider, enabledModels, aiNotes],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1180px] p-0 overflow-hidden">
        <div className="flex h-[80vh] max-h-[820px]">
          {/* Sidebar */}
          <aside className="w-52 flex-shrink-0 bg-stone-50/80 border-r border-stone-200/70 flex flex-col">
            <DialogHeader className="px-4 pt-4 pb-3 text-left">
              <DialogTitle className="flex items-center gap-1.5 text-[14px] font-semibold text-stone-900">
                <Palette className="w-4 h-4 text-stone-700" />
                Design System
              </DialogTitle>
              <DialogDescription className="text-[11.5px] text-stone-500 leading-snug mt-1">
                One source of truth for colors, type, and spacing.
              </DialogDescription>
            </DialogHeader>

            <div className="mx-4 h-px bg-stone-200/80" />

            {/* Primary nav — icon + title + subtitle */}
            <nav className="px-2 pt-2 flex flex-col gap-0.5">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.id;
                const disabled = !ready;
                return (
                  <button
                    key={item.id}
                    onClick={() => !disabled && setSection(item.id)}
                    disabled={disabled}
                    className={`group flex items-start gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-white shadow-sm text-stone-900"
                        : disabled
                          ? "text-stone-400 cursor-not-allowed"
                          : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-[2px] flex-shrink-0 ${
                        isActive
                          ? "text-stone-800"
                          : disabled
                            ? "text-stone-300"
                            : "text-stone-500 group-hover:text-stone-700"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold leading-tight">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[10.5px] leading-tight text-stone-500 mt-0.5 truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Secondary nav — single line items with chevron */}
            <nav className="px-2 pb-1 flex flex-col">
              {SECONDARY_NAV.map((item) => {
                const isActive = section === item.id;
                const disabled = !ready;
                return (
                  <button
                    key={item.id}
                    onClick={() => !disabled && setSection(item.id)}
                    disabled={disabled}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-white shadow-sm text-stone-900"
                        : disabled
                          ? "text-stone-400 cursor-not-allowed"
                          : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="text-[12.5px] font-medium">
                      {item.label}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        disabled
                          ? "text-stone-300"
                          : "text-stone-400 group-hover:text-stone-600 group-hover:translate-x-0.5 transition-all"
                      }`}
                    />
                  </button>
                );
              })}

              {/* AI toggle row — same single-line treatment as secondary items */}
              <button
                type="button"
                onClick={() =>
                  ready && setInjectIntoGeneration(!injectIntoGeneration)
                }
                disabled={!ready}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                  !ready
                    ? "text-stone-400 cursor-not-allowed"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span className="text-[12.5px] font-medium text-left leading-tight">
                  Always use the DS with AI
                </span>
                <Switch checked={injectIntoGeneration} disabled={!ready} />
              </button>
            </nav>

            {/* Status footer */}
            <div className="mx-4 h-px bg-stone-200/80" />
            <div className="px-4 py-2.5">
              <ReadyBadge status={status} loading={statusLoading} />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            {section === "home" && (
              <HomeSection
                status={status}
                statusLoading={statusLoading}
                setupRunning={cli.setupRunning}
                setupLog={cli.setupLog}
                onSetup={cli.runSetup}
                onScaffold={scaffoldOnly}
                onGo={(s) => setSection(s)}
                injectIntoGeneration={injectIntoGeneration}
                onToggleInject={setInjectIntoGeneration}
                aiRunning={cli.aiRunning}
                aiLog={cli.aiLog}
                aiNotes={aiNotes}
                onAiNotes={setAiNotes}
                onAiGenerate={generateFromCodebase}
                providerLabel={getProvider(activeProvider).displayName}
              />
            )}
            {section === "preview" && (
              <PreviewSection
                content={fileContent}
                loading={fileLoading}
                onEdit={() => setSection("edit")}
                aiRunning={cli.aiRunning}
                onAiRegenerate={generateFromCodebase}
              />
            )}
            {section === "edit" && (
              <EditSection
                content={fileContent}
                loading={fileLoading}
                saving={cli.fileSaving}
                dirty={cli.fileDirty}
                fileExists={!!status?.fileExists}
                onChange={(v) => {
                  cli.setFileContent(v);
                  cli.setFileDirty(true);
                }}
                onSave={cli.saveFile}
                onScaffold={scaffoldOnly}
                onReload={loadFile}
                aiRunning={cli.aiRunning}
                aiLog={cli.aiLog}
                onAiRegenerate={generateFromCodebase}
              />
            )}
            {section === "check" && (
              <ActionSection
                title="Check your design system"
                blurb="We'll scan for missing colors, broken token references, and accessibility issues like low color contrast."
                actionLabel="Run check"
                running={cli.lintRunning}
                result={cli.lintResult}
                onRun={cli.runLint}
                installed={!!status?.installed}
                successHint="Looks great — no issues found."
              />
            )}
            {section === "history" && (
              <ActionSection
                title="See what you changed"
                blurb="Compare your current design system with the last saved version in git."
                actionLabel="Show changes"
                running={cli.diffRunning}
                result={cli.diffResult}
                onRun={cli.runDiff}
                installed={!!status?.installed}
                successHint="No changes since your last commit."
              />
            )}
            {section === "export" && (
              <ExportSection
                format={cli.exportFormat}
                setFormat={cli.setExportFormat}
                running={cli.exportRunning}
                result={cli.exportResult}
                onRun={cli.runExport}
                installed={!!status?.installed}
              />
            )}
            {section === "spec" && (
              <SpecSection
                running={cli.specRunning}
                result={cli.specResult}
                installed={!!status?.installed}
                onRun={cli.runSpec}
              />
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Suppress "unused" warnings for resolveToken / ParsedDesignSystem when only
// indirectly used; both are public API of the parser.
void resolveToken;
export type { ParsedDesignSystem as _ParsedDesignSystem };
