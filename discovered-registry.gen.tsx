/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Regenerated wholesale from `discovered-registry.json` by the
 * discovery analyze/remove flow (server/routes/discover.ts). Discovered
 * components live in that JSON manifest, which the playground owns; this module
 * turns the manifest into a real registry array with live component imports so
 * Vite HMR reflects additions/removals. It is never spliced into the
 * hand-written registry.tsx — the whole file is replaced from data each time.
 */
import type { ComponentType } from "react"
import type { RegistryLeafItem } from "./registry"

import Cmp_download_as_csv from "@/features/trade-history/components/DownloadAsCSV"
import { Button as Cmp_button } from "@/components/ui/button"
import { Badge as Cmp_badge } from "@/components/ui/badge"

export const discoveredRegistry: RegistryLeafItem[] = [
  {
    id: "download-as-csv",
    label: "Download As CSV",
    Component: Cmp_download_as_csv as unknown as ComponentType<Record<string, unknown>>,
    props: {
      "data": [
        {
          "asset": "EURUSD",
          "side": "Long",
          "formattedDates": {
            "start": "2026-07-10 09:30",
            "end": "2026-07-10 14:15"
          },
          "riskPercentage": {
            "percent": 1.5,
            "amount": 150
          },
          "formattedRealized": "+$312.40",
          "heldTime": "4h 45m"
        },
        {
          "asset": "GBPJPY",
          "side": "Short",
          "formattedDates": {
            "start": "2026-07-11 11:00",
            "end": "2026-07-11 16:45"
          },
          "riskPercentage": {
            "percent": 2,
            "amount": 200
          },
          "formattedRealized": "-$87.20",
          "heldTime": "5h 45m"
        },
        {
          "asset": "XAUUSD",
          "side": "Long",
          "formattedDates": {
            "start": "2026-07-14 08:15",
            "end": "2026-07-15 10:30"
          },
          "riskPercentage": {
            "percent": 1,
            "amount": 100
          },
          "formattedRealized": "+$540.00",
          "heldTime": "1d 2h 15m"
        }
      ],
      "columns": [
        {
          "key": "asset",
          "label": "Asset"
        },
        {
          "key": "side",
          "label": "Side"
        },
        {
          "key": "dateStart",
          "label": "Entry Date"
        },
        {
          "key": "dateEnd",
          "label": "Exit Date"
        },
        {
          "key": "risk",
          "label": "Risk"
        },
        {
          "key": "realized",
          "label": "Realized P&L"
        },
        {
          "key": "duration",
          "label": "Duration"
        }
      ],
      "sessionId": "a1b2c3d4e5f6g7h8"
    } as Record<string, unknown>,
    sourcePath: "src/features/trade-history/components/DownloadAsCSV.tsx",
    size: "default",
  },
  {
    id: "button",
    label: "Button",
    Component: Cmp_button as unknown as ComponentType<Record<string, unknown>>,
    props: {
      "variant": "default",
      "children": "Get Started"
    } as Record<string, unknown>,
    sourcePath: "src/components/ui/button.tsx",
    size: "default",
    parentId: "download-as-csv",
  },
  {
    id: "badge",
    label: "Badge",
    Component: Cmp_badge as unknown as ComponentType<Record<string, unknown>>,
    props: {
      "variant": "default",
      "children": "Funded"
    } as Record<string, unknown>,
    sourcePath: "src/components/ui/badge.tsx",
    size: "default",
  },
]
