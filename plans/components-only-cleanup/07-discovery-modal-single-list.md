Stack: TypeScript + React 18 (Vite host). Key file: components/modals/DiscoveryModal.tsx.

TASK: Remove the "Pages" section and all page/route handling from the Add-to-Playground modal, leaving a single flat list of components.

DETAILS — components/modals/DiscoveryModal.tsx:
1. `DiscoveryEntry` interface: change `type: "page" | "component";` → `type: "component";` and DELETE the `route?: string;` field.
2. In the poll `onComplete` handler: delete the `const pages = data.entries.filter(e => e.type === "page")` line and the `components` filter, and change the toast to components-only, e.g.
   `toast.success(\`Found \${data.entries.length} component\${data.entries.length !== 1 ? "s" : ""}\`, { duration: 4000 });`
3. In the derived lists near the render: delete `const pages = …` and `const filteredPages = filtered.filter(e => e.type === "page")`. Keep `filteredComponents` (or just use `filtered` directly since everything is a component now).
4. DELETE the entire `{/* Pages section */}` JSX block (the `{filteredPages.length > 0 && ( … )}` with the `SectionHeader icon={FileText} label="Pages" …`).
5. Keep the Components section. Since there is now only one type, you may drop its `SectionHeader` entirely and render the single list, OR keep the "Components" header — either is fine; prefer dropping the header for a clean single list.
6. In `DiscoveryCard`: remove the `{entry.route && ( … )}` block and unwrap the `{!entry.route && ( … )}` block so the path breadcrumb always renders.
7. Copy fixes: DialogDescription "Discover components and pages in your project" → "Discover components in your project"; the "Found N pages and M components" description → components-only count; the scanning hint "discovering components and pages" → "discovering components".
8. Remove the now-unused `FileText` import (from lucide-react) if nothing else uses it after deleting the Pages SectionHeader.

CONSTRAINTS:
- Do not touch the server or the scan flow — display only.
- Keep search, refresh, empty-state, and DiscoveryCard "Add" behavior working.

VERIFY:
- `grep -n "page\|route\|FileText" components/modals/DiscoveryModal.tsx` shows no `type === "page"`, no `filteredPages`, no `entry.route`, no leftover `FileText` import.
- Modal opens, scans, and lists components with a working Add button.
