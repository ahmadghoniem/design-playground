import { useEffect, useState } from "react";
import { registry, subscribeRegistry } from "@pg/registry";
import type { RegistryLeafItem } from "@pg/registry-types";

/** Reactive view of the live registry (updates on HMR of discovered-registry.gen). */
export function useRegistryItems(): RegistryLeafItem[] {
  const [items, setItems] = useState<RegistryLeafItem[]>(() => registry);

  useEffect(() => subscribeRegistry(setItems), []);

  return items;
}
