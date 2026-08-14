import { useState, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Toaster } from "sonner";
import PlaygroundSidebar from "@pg/app/PlaygroundSidebar";
import PlaygroundCanvas from "./PlaygroundCanvas";
import PlaygroundHeader from "./PlaygroundHeader";
import SkillsCatalogModal from "@pg/features/skills/SkillsCatalogModal";
import { CANVAS_STATE_STORAGE_KEY } from "@pg/shared/lib/constants";
import { preloadAllComponents } from "@pg/registry";
import { CanvasFlowProvider } from "@pg/features/canvas/canvas-flow";
import { hydratePlaygroundRelativeRoot } from "@pg/shared/lib/playground-paths";
import {
  previewSchemeClass,
  usePreviewColorSchemeStore,
} from "@pg/shared/stores/preview-color-scheme-store";
import { useSkillsUiStore } from "@pg/shared/stores/skills-ui-store";

// Vite injects the host-relative playground root at bundle time — no HTTP.
hydratePlaygroundRelativeRoot();

interface ProjectBootstrap {
  projectId: string;
  projectName: string;
}

function useProjectBootstrap(): ProjectBootstrap | null {
  const [project, setProject] = useState<ProjectBootstrap | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/playground/api/project-id")
      .then((res) => res.json())
      .then((data: { projectId: string; projectName?: string }) => ({
        projectId: data.projectId,
        projectName:
          typeof data.projectName === "string" && data.projectName
            ? data.projectName
            : "project",
      }))
      .catch(() => ({
        projectId: "unknown-project",
        projectName: "project",
      }))
      .then((bootstrap) => {
        if (!cancelled) setProject(bootstrap);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return project;
}

export default function PlaygroundClient() {
  const project = useProjectBootstrap();
  const projectId = project?.projectId ?? null;
  const projectName = project?.projectName ?? "project";
  const skillsCatalogOpen = useSkillsUiStore((s) => s.catalogOpen);
  const setSkillsCatalogOpen = useSkillsUiStore((s) => s.setCatalogOpen);
  const bumpSkillsVersion = useSkillsUiStore((s) => s.bumpSkillsVersion);

  // Preload all dynamic components to prevent HMR cascades on first drop
  useEffect(() => {
    const schedule =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 100);
    const id = schedule(() => preloadAllComponents());
    return () => {
      if (typeof cancelIdleCallback === "function" && typeof id === "number") {
        cancelIdleCallback(id);
      }
    };
  }, []);

  // Per-canvas preview color-scheme override. '' = auto (mirror the host); the
  // `dark`/`light` class sits on the canvas root so the host's own `.dark`
  // token overrides cascade into every preview while the chrome (which reads
  // the private --pg-* namespace) is unaffected.
  const previewSchemeClassName = previewSchemeClass(
    usePreviewColorSchemeStore((s) => s.scheme),
  );

  if (!projectId) return null;

  const body = (
    <ReactFlowProvider>
      <div
        className={`playground-main-view fixed inset-0 flex flex-col overflow-hidden z-50 ${previewSchemeClassName}`}
        style={{ fontFamily: "var(--pg-font-sans)", background: "#f5f5f4" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      >
        {/* Top header — full width */}
        <PlaygroundHeader projectName={projectName} />

        {/* Body: sidebar + canvas */}
        {/* Rail: inset 1.5rem (= left-6), toolbar outer width ~54px, tight gap */}
        <div className="flex flex-1 overflow-hidden relative">
          <div className="absolute left-[calc(1.5rem+54px+0.5rem)] top-6 bottom-6 z-10">
            <PlaygroundSidebar />
          </div>

          {/* Canvas — always full size, sidebar overlays */}
          <div className="flex-1 relative">
            <CanvasFlowProvider
              storageKey={
                projectId ? `${CANVAS_STATE_STORAGE_KEY}:${projectId}` : CANVAS_STATE_STORAGE_KEY
              }
            >
              <PlaygroundCanvas projectId={projectId} />
            </CanvasFlowProvider>
          </div>
        </div>
      </div>

      {/* Skills catalog modal */}
      <SkillsCatalogModal
        open={skillsCatalogOpen}
        onOpenChange={setSkillsCatalogOpen}
        onSkillsChanged={bumpSkillsVersion}
      />
    </ReactFlowProvider>
  );

  const toaster = <Toaster position="bottom-right" richColors closeButton />;

  return (
    <>
      {toaster}
      {body}
    </>
  );
}
