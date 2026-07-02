import { useCallback, useEffect, useState } from "react";
import {
  GENERATION_COMPLETE_EVENT,
  JSX_COMPONENT_ADDED_EVENT,
  DESIGN_SYSTEM_GENERATED_EVENT,
} from "../../../lib/constants";
import type { HtmlPageInfo, JsxComponentInfo } from "../../../lib/constants";

/**
 * Owns the sidebar's "react to discovery" surface: fetching HTML pages /
 * JSX components, fetching the generated design-system showcase, and the
 * window-event listeners that trigger a refresh (`playground:html-pages-updated`,
 * `GENERATION_COMPLETE_EVENT`, `JSX_COMPONENT_ADDED_EVENT`, `DESIGN_SYSTEM_GENERATED_EVENT`).
 * The sidebar shell no longer inlines this event plumbing.
 */
export function useSidebarDiscoverySync() {
  const [htmlPages, setHtmlPages] = useState<HtmlPageInfo[]>([]);
  const [jsxComponents, setJsxComponents] = useState<JsxComponentInfo[]>([]);
  const [isRefreshingHtml, setIsRefreshingHtml] = useState(false);
  const [designSystemHtml, setDesignSystemHtml] = useState<string | null>(null);

  const fetchHtmlPages = useCallback(async () => {
    try {
      setIsRefreshingHtml(true);
      const [htmlRes, jsxRes] = await Promise.all([
        fetch("/playground/api/html-pages"),
        fetch("/playground/api/oncanvas-components"),
      ]);
      if (htmlRes.ok) {
        const data = await htmlRes.json();
        setHtmlPages(data.pages || []);
      }
      if (jsxRes.ok) {
        const data = await jsxRes.json();
        setJsxComponents(data.components || []);
      }
    } catch {
      /* ignore */
    } finally {
      setIsRefreshingHtml(false);
    }
  }, []);

  useEffect(() => {
    fetchHtmlPages();
  }, [fetchHtmlPages]);

  useEffect(() => {
    const refresh = () => {
      void fetchHtmlPages();
    };
    window.addEventListener("playground:html-pages-updated", refresh);
    window.addEventListener(
      GENERATION_COMPLETE_EVENT,
      refresh as EventListener,
    );
    window.addEventListener(
      JSX_COMPONENT_ADDED_EVENT,
      refresh as EventListener,
    );
    return () => {
      window.removeEventListener("playground:html-pages-updated", refresh);
      window.removeEventListener(
        GENERATION_COMPLETE_EVENT,
        refresh as EventListener,
      );
      window.removeEventListener(
        JSX_COMPONENT_ADDED_EVENT,
        refresh as EventListener,
      );
    };
  }, [fetchHtmlPages]);

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
    htmlPages,
    jsxComponents,
    isRefreshingHtml,
    fetchHtmlPages,
    designSystemHtml,
    fetchDesignSystem,
  };
}
