# Task 02 — Disable auto-scan of the host project for components

**Type:** cleanup · **Risk:** low · **Depends on:** none · **Blast radius:** 1 file (+ optional follow-ups)

## Goal

Stop the playground from **automatically** kicking off an AI discovery scan of the host project the first time the user visits. Discovery must remain available **on demand** (the user can still open the Discovery modal and scan manually). Only the automatic-on-first-visit behaviour is removed.

## Context

`PlaygroundClient.tsx` runs an effect commented **"Auto-scan on first visit"** (around line 153). On mount it `GET`s `/playground/api/discover`; if the status is `not_scanned`, it `POST`s to `/playground/api/discover` to start an AI scan and shows a `toast.loading('Scanning your project for components…')`. It also has a branch that *joins* an already-running scan from a previous session (also around lines 207–241), polling via `scanPollRef`.

The on-demand path is separate and must keep working:
- `components/canvas/PlaygroundSidebar.tsx` exposes `onOpenDiscovery` (button at lines ~778 and ~828).
- `components/modals/DiscoveryModal.tsx` does its own fetch/scan/poll when opened.
- `server/routes/discover.ts` serves `GET/POST/DELETE /api/discover`.

## Step-by-step

1. In `PlaygroundClient.tsx`, **remove the entire "Auto-scan on first visit" effect** (the `useEffect` starting ~line 153 through its closing `}, [...])`). This includes:
   - the initial `GET /playground/api/discover`,
   - the `not_scanned` → `POST` auto-start branch,
   - the `scanning` → join-and-poll branch and its `toast.loading('Scanning your project for components…')`.
2. **Remove now-dead supporting state**: `scanPollRef` (declared ~line 61) and its cleanup in the unmount effect (~line 116) — but only if nothing else references them. `git grep -n "scanPollRef" PlaygroundClient.tsx` to confirm before deleting.
3. **Leave the manual path untouched**: the Discovery modal, the sidebar "discover" buttons, and the server routes all stay. Do not weaken `server/routes/discover.ts`.
4. **Leave the "catch-up / orphaned children auto-analyze" effect** (~line 332) as-is **unless** it depends on the auto-scan having run. Read it: it only re-analyzes components the user already added. It is not the first-visit scan. Keep it.

## Verification

- Fresh load of `/playground` (clear the discovery cache / use a host project with no `discovery.json`): **no** "Scanning your project for components…" toast appears, **no** background scan starts. Confirm via network tab — no automatic `POST /playground/api/discover` on load.
- Open the Discovery modal from the sidebar → it can still scan on demand (manual `POST` fires, results render).
- No console errors about undefined `scanPollRef`.

## Done when

Visiting the playground never auto-starts a scan; discovery is reachable only through explicit user action.

## Do NOT

- Do not delete `DiscoveryModal.tsx`, the sidebar discover buttons, or `server/routes/discover.ts`.
- Do not remove the manual refresh/scan inside the Discovery modal.
