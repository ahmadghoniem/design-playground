import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { StatusResponse, CliResult } from "./cards";

/**
 * Owns every `/playground/api/design/*` call and the lifecycle state that
 * goes with it (status polling, file load/save, setup/lint/diff/export/spec,
 * and the AI "generate from codebase" stream). Sections are pure consumers
 * of this hook's return value — no section issues a `fetch` directly.
 *
 * `open` controls the file/status refresh-on-open and abort-on-close
 * behaviour that previously lived inline in the modal.
 */
export function useDesignSystemCli(open: boolean) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [setupRunning, setSetupRunning] = useState(false);
  const [setupLog, setSetupLog] = useState("");
  const setupAbortRef = useRef<AbortController | null>(null);

  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [fileDirty, setFileDirty] = useState(false);

  const [lintResult, setLintResult] = useState<CliResult | null>(null);
  const [lintRunning, setLintRunning] = useState(false);

  const [diffResult, setDiffResult] = useState<CliResult | null>(null);
  const [diffRunning, setDiffRunning] = useState(false);

  const [exportFormat, setExportFormat] = useState<"tailwind" | "dtcg">(
    "tailwind",
  );
  const [exportResult, setExportResult] = useState<CliResult | null>(null);
  const [exportRunning, setExportRunning] = useState(false);

  const [specResult, setSpecResult] = useState<CliResult | null>(null);
  const [specRunning, setSpecRunning] = useState(false);

  const [aiRunning, setAiRunning] = useState(false);
  const [aiLog, setAiLog] = useState("");
  const aiAbortRef = useRef<AbortController | null>(null);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/playground/api/design/status", {
        cache: "no-store",
      });
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadFile = useCallback(async () => {
    setFileLoading(true);
    try {
      const res = await fetch("/playground/api/design/file", {
        cache: "no-store",
      });
      const data = (await res.json()) as { exists: boolean; content: string };
      setFileContent(data.content);
      setFileDirty(false);
    } catch {
      toast.error("Could not read your design system");
    } finally {
      setFileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      refreshStatus();
      loadFile();
    } else {
      setupAbortRef.current?.abort();
      setupAbortRef.current = null;
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
    }
  }, [open, refreshStatus, loadFile]);

  const generateFromCodebase = useCallback(
    async (opts: { provider: string; model?: string; notes?: string }) => {
      setAiRunning(true);
      setAiLog("");
      const abort = new AbortController();
      aiAbortRef.current = abort;
      try {
        const res = await fetch(
          "/playground/api/design/generate-from-codebase",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: opts.provider,
              model: opts.model,
              notes: opts.notes?.trim() || undefined,
            }),
            signal: abort.signal,
          },
        );
        if (!res.body) {
          setAiLog("No response from server.");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          setAiLog((prev) => prev + decoder.decode(value, { stream: true }));
        }
        toast.success("AI finished. Reloading…");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("AI generation failed");
          setAiLog((prev) => prev + `\n[error] ${(error as Error).message}`);
        }
      } finally {
        setAiRunning(false);
        aiAbortRef.current = null;
        refreshStatus();
        loadFile();
      }
    },
    [refreshStatus, loadFile],
  );

  const runSetup = useCallback(async () => {
    setSetupRunning(true);
    setSetupLog("");
    const abort = new AbortController();
    setupAbortRef.current = abort;
    try {
      const res = await fetch("/playground/api/design/setup", {
        method: "POST",
        signal: abort.signal,
      });
      if (!res.body) {
        setSetupLog("No response from server.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setSetupLog((prev) => prev + chunk);
      }
      toast.success("Design system ready");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Setup failed");
        setSetupLog((prev) => prev + `\n[error] ${(error as Error).message}`);
      }
    } finally {
      setSetupRunning(false);
      setupAbortRef.current = null;
      refreshStatus();
      loadFile();
    }
  }, [refreshStatus, loadFile]);

  const scaffoldOnly = useCallback(async () => {
    try {
      const res = await fetch("/playground/api/design/file", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not create your design system");
      }
      toast.success("Created your starter design system");
      await loadFile();
      await refreshStatus();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [loadFile, refreshStatus]);

  const saveFile = useCallback(async () => {
    setFileSaving(true);
    try {
      const res = await fetch("/playground/api/design/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileContent }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Save failed");
      }
      setFileDirty(false);
      toast.success("Saved");
      refreshStatus();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setFileSaving(false);
    }
  }, [fileContent, refreshStatus]);

  const runLint = useCallback(async () => {
    setLintRunning(true);
    try {
      const res = await fetch("/playground/api/design/lint", {
        method: "POST",
      });
      const data = (await res.json()) as CliResult;
      setLintResult(data);
    } finally {
      setLintRunning(false);
    }
  }, []);

  const runDiff = useCallback(async () => {
    setDiffRunning(true);
    try {
      const res = await fetch("/playground/api/design/diff", {
        method: "POST",
      });
      const data = (await res.json()) as CliResult;
      setDiffResult(data);
    } finally {
      setDiffRunning(false);
    }
  }, []);

  const runExport = useCallback(async () => {
    setExportRunning(true);
    try {
      const res = await fetch("/playground/api/design/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat }),
      });
      const data = (await res.json()) as CliResult;
      setExportResult(data);
    } finally {
      setExportRunning(false);
    }
  }, [exportFormat]);

  const runSpec = useCallback(async () => {
    setSpecRunning(true);
    try {
      const res = await fetch("/playground/api/design/spec");
      const data = (await res.json()) as CliResult;
      setSpecResult(data);
    } finally {
      setSpecRunning(false);
    }
  }, []);

  return {
    status,
    statusLoading,
    refreshStatus,

    setupRunning,
    setupLog,
    runSetup,

    fileContent,
    setFileContent,
    fileLoading,
    fileSaving,
    fileDirty,
    setFileDirty,
    loadFile,
    saveFile,
    scaffoldOnly,

    lintResult,
    lintRunning,
    runLint,

    diffResult,
    diffRunning,
    runDiff,

    exportFormat,
    setExportFormat,
    exportResult,
    exportRunning,
    runExport,

    specResult,
    specRunning,
    runSpec,

    aiRunning,
    aiLog,
    generateFromCodebase,
  };
}
