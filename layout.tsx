import { useEffect, type ReactNode } from "react";
import "./playground-global.css";
import "./playground-tailwind-entry.css";

/** Runs once on mount — patches fetch before bundled JS makes any cross-origin calls. */
function useTunnelFetchPatch() {
  useEffect(() => {
    if (typeof window === "undefined" || (window as any).__playgroundTunnelFetchPatched) return;
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return;
    (window as any).__playgroundTunnelFetchPatched = true;
    const o = window.fetch.bind(window);
    function s(u: string) {
      if (u.charAt(0) === "/") return true;
      try {
        return new URL(u, location.origin).origin === location.origin;
      } catch {
        return false;
      }
    }
    window.fetch = function (i: RequestInfo | URL, n?: RequestInit) {
      const u = typeof i === "string" ? i : i instanceof Request ? i.url : i.toString();
      if (!s(u)) return o(i as RequestInfo, n);
      if (i instanceof Request) {
        const rh = new Headers(i.headers);
        rh.set("ngrok-skip-browser-warning", "true");
        return o(new Request(i, { headers: rh }), n);
      }
      const h2 = new Headers(n && n.headers);
      h2.set("ngrok-skip-browser-warning", "true");
      return o(i as RequestInfo, Object.assign({}, n, { headers: h2 }));
    };
  }, []);
}

export function PlaygroundLayout({ children }: { children: ReactNode }) {
  useTunnelFetchPatch();
  return <>{children}</>;
}
