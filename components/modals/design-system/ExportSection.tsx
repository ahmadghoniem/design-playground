import { toast } from "sonner";
import { Loader2, Copy } from "lucide-react";
import { SectionShell, ResultCard, FormatCard, type CliResult } from "./cards";

export default function ExportSection({
  format,
  setFormat,
  running,
  result,
  onRun,
  installed,
}: {
  format: "tailwind" | "dtcg";
  setFormat: (f: "tailwind" | "dtcg") => void;
  running: boolean;
  result: CliResult | null;
  onRun: () => void;
  installed: boolean;
}) {
  return (
    <SectionShell
      title="Export to code"
      blurb="Turn your design system into a format your code can use. Tailwind plugs straight into a Tailwind project; W3C tokens work with most other tools."
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <FormatCard
            label="Tailwind"
            description="Drop into tailwind.config"
            active={format === "tailwind"}
            onClick={() => setFormat("tailwind")}
          />
          <FormatCard
            label="W3C tokens"
            description="DTCG JSON for Figma & others"
            active={format === "dtcg"}
            onClick={() => setFormat("dtcg")}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={running || !installed}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50"
          >
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
            {running ? "Generating…" : "Generate"}
          </button>
          {result?.ok && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.stdout);
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Copy failed");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          )}
        </div>

        <ResultCard
          result={result}
          successHint="Click Generate to see the output."
        />
      </div>
    </SectionShell>
  );
}
