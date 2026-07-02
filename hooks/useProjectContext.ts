import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// useProjectContext
// ---------------------------------------------------------------------------
// Resolves the current project's name and filesystem path from
// /playground/api/open-in on mount. Best-effort — the project label/path
// in the header are cosmetic, so failures are swallowed.
// ---------------------------------------------------------------------------

export interface ProjectContext {
  projectName: string;
  projectPath: string;
}

const DEFAULT_PROJECT_CONTEXT: ProjectContext = {
  projectName: "project",
  projectPath: "",
};

export function useProjectContext(): ProjectContext {
  const [projectContext, setProjectContext] = useState<ProjectContext>(
    DEFAULT_PROJECT_CONTEXT,
  );

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/playground/api/open-in");
        if (!response.ok) return;
        const data = await response.json();
        if (
          typeof data?.projectName === "string" &&
          typeof data?.projectPath === "string"
        ) {
          setProjectContext({
            projectName: data.projectName,
            projectPath: data.projectPath,
          });
        }
      } catch {
        // Ignore failures — project menu is best effort in dev.
      }
    })();
  }, []);

  return projectContext;
}
