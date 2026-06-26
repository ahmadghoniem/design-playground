import { type ReactNode } from "react";
import "./playground-global.css";
import "./playground-tailwind-entry.css";

export function PlaygroundLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
