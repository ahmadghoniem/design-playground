import { type ReactNode } from "react";
import "../styles/playground-global.css";
import "../playground-tailwind-entry.css";

export function PlaygroundLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
