import { useCallback, useEffect, useState } from "react";
import { DESIGN_SYSTEM_GENERATED_EVENT } from "../../../lib/constants";

/**
 * Owns the sidebar's "react to discovery" surface: fetching the generated
 * design-system showcase and re-fetching it when a regeneration completes
 * (`DESIGN_SYSTEM_GENERATED_EVENT`). The sidebar shell no longer inlines this
 * event plumbing.
 */
export function useSidebarDiscoverySync() {
  const [designSystemHtml, setDesignSystemHtml] = useState<string | null>(null);

  const fetchDesignSystem = useCallback(async () => {
    try {
      const res = await fetch("/playground/api/design/preview-showcase", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        exists: boolean;
        html: string | null;
      };
      setDesignSystemHtml(data.exists && data.html ? data.html : null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchDesignSystem();
  }, [fetchDesignSystem]);

  useEffect(() => {
    const handler = () => {
      fetchDesignSystem();
    };
    window.addEventListener(DESIGN_SYSTEM_GENERATED_EVENT, handler);
    return () =>
      window.removeEventListener(DESIGN_SYSTEM_GENERATED_EVENT, handler);
  }, [fetchDesignSystem]);

  return {
    designSystemHtml,
    fetchDesignSystem,
  };
}
