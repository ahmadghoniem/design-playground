import { useState, useEffect, useRef, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Toaster } from "sonner";
import PlaygroundSidebar from "@pg/app/PlaygroundSidebar";
import PlaygroundCanvas from "./PlaygroundCanvas";
import PlaygroundHeader from "./PlaygroundHeader";
import SkillsCatalogModal from "@pg/features/skills/SkillsCatalogModal";
import {
  OPEN_SKILLS_CATALOG_EVENT,
  SKILLS_CHANGED_EVENT,
  STORAGE_KEY,
} from "@pg/shared/lib/constants";
import { preloadAllComponents } from "@pg/registry";
import { CanvasFlowProvider } from "@pg/features/canvas/canvas-flow";
import { ensurePlaygroundRelativeRoot } from "@pg/shared/lib/playground-paths";
import {
  previewSchemeClass,
  usePreviewColorSchemeStore,
} from "@pg/shared/stores/preview-color-scheme-store";

interface ProjectBootstrap {
  projectId: string;
  projectName: string;
}

function useProjectBootstrap(): ProjectBootstrap | null {
  const [project, setProject] = useState<ProjectBootstrap | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
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
        })),
      ensurePlaygroundRelativeRoot(),
    ]).then(([bootstrap]) => {
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  /** Whether sidebar was opened via hover (auto-hide) vs click (sticky). */
  const sidebarHoverRef = useRef(false);
  const sidebarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [skillsCatalogOpen, setSkillsCatalogOpen] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const cancelSidebarHideTimer = useCallback(() => {
    if (sidebarHideTimerRef.current) {
      clearTimeout(sidebarHideTimerRef.current);
      sidebarHideTimerRef.current = null;
    }
  }, []);

  const handleShowSidebar = useCallback(() => {
    cancelSidebarHideTimer();
    if (!sidebarVisible) {
      sidebarHoverRef.current = true;
      setSidebarVisible(true);
    }
  }, [sidebarVisible, cancelSidebarHideTimer]);

  const startSidebarHideTimer = useCallback(() => {
    if (!sidebarHoverRef.current) return;
    cancelSidebarHideTimer();
    sidebarHideTimerRef.current = setTimeout(() => {
      setSidebarVisible(false);
      sidebarHoverRef.current = false;
    }, 120);
  }, [cancelSidebarHideTimer]);

  const handleToggleSidebar = useCallback(
    (forceOpen = false) => {
      cancelSidebarHideTimer();
      setSidebarVisible((visible) => {
        if (forceOpen) {
          sidebarHoverRef.current = false;
          return true;
        }

        if (!visible) {
          sidebarHoverRef.current = false;
          return true;
        }

        sidebarHoverRef.current = false;
        return false;
      });
    },
    [cancelSidebarHideTimer],
  );

  // Cleanup the sidebar-hide timer on unmount
  useEffect(() => {
    return () => {
      if (sidebarHideTimerRef.current)
        clearTimeout(sidebarHideTimerRef.current);
    };
  }, []);

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

  // Listen for requests to open the Skills catalog
  useEffect(() => {
    const handler = () => setSkillsCatalogOpen(true);
    window.addEventListener(OPEN_SKILLS_CATALOG_EVENT, handler);
    return () => window.removeEventListener(OPEN_SKILLS_CATALOG_EVENT, handler);
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
        <PlaygroundHeader
          projectName={projectName}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={handleToggleSidebar}
          onClear={() => setShowClearDialog(true)}
        />

        {/* Body: sidebar + canvas */}
        {/* Rail: inset 1.5rem (= left-6), toolbar outer width ~54px, tight gap */}
        <div className="flex flex-1 overflow-hidden relative">
          <div
            className={`absolute left-[calc(1.5rem+54px+0.5rem)] top-6 bottom-6 z-10 transition-all duration-[160ms] ease-out ${
              sidebarVisible
                ? "opacity-100 translate-x-0 pointer-events-auto"
                : "opacity-0 -translate-x-3 pointer-events-none"
            }`}
            onMouseEnter={cancelSidebarHideTimer}
            onMouseLeave={startSidebarHideTimer}
          >
            <PlaygroundSidebar
              onCollapse={() => {
                cancelSidebarHideTimer();
                sidebarHoverRef.current = false;
                setSidebarVisible(false);
              }}
            />
          </div>

          {/* Canvas — always full size, sidebar overlays */}
          <div className="flex-1 relative">
            <CanvasFlowProvider
              storageKey={
                projectId ? `${STORAGE_KEY}:${projectId}` : STORAGE_KEY
              }
            >
              <PlaygroundCanvas
                sidebarVisible={sidebarVisible}
                onToggleSidebar={handleToggleSidebar}
                onShowSidebar={handleShowSidebar}
                onHideSidebar={startSidebarHideTimer}
                projectId={projectId}
                showClearDialog={showClearDialog}
                setShowClearDialog={setShowClearDialog}
              />
            </CanvasFlowProvider>
          </div>
        </div>
      </div>

      {/* Skills catalog modal */}
      <SkillsCatalogModal
        open={skillsCatalogOpen}
        onOpenChange={setSkillsCatalogOpen}
        onSkillsChanged={() => {
          window.dispatchEvent(new CustomEvent(SKILLS_CHANGED_EVENT));
        }}
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
