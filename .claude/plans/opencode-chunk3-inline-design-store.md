Stack: TypeScript + React 18 (no build step — host compiles). Key files: components/modals/DesignSystemModal.tsx, stores/design-system-store.ts (to be deleted).

TASK: Inline the single-consumer zustand store stores/design-system-store.ts into components/modals/DesignSystemModal.tsx as local state, with the existing `pg-design-inject` cookie as the single source of truth.

DETAILS — components/modals/DesignSystemModal.tsx:
1. Remove the import of `useDesignSystemStore` from "../../stores/design-system-store".
2. Add a module-level helper above the component:
   ```ts
   function readDesignInjectCookie(): boolean {
     return /(?:^|;\s*)pg-design-inject=1(?:;|$)/.test(document.cookie);
   }
   ```
3. Replace the two store selectors (`injectIntoGeneration`, `setInjectIntoGeneration`) with local state initialized from the cookie:
   ```ts
   const [injectIntoGeneration, setInjectIntoGeneration] = useState(readDesignInjectCookie);
   ```
4. Keep the existing useEffect that writes the cookie (`document.cookie = \`pg-design-inject=...\``) exactly as is — it now IS the persistence, not a mirror.
5. The component has a `ready` / hydration gate tied to the store's `hasHydrated`; since cookie reads are synchronous, remove the hydration gating for this toggle: wherever `ready` (or `hasHydrated`) only guarded the injectIntoGeneration switch, drop the guard and the disabled={!ready} on that Switch. If `ready` also guards unrelated things, leave those usages alone.
6. Ensure `useState` is imported from react (it likely already is).

DETAILS — stores/design-system-store.ts:
Delete the file entirely.

CONSTRAINTS:
- Do not touch components/modals/design-system/HomeSection.tsx — it receives injectIntoGeneration as a prop and keeps working unchanged.
- Do not change the cookie name, format, or max-age.
- Do not touch any other file. localStorage key 'playground-design-system-v1' is intentionally orphaned (no migration needed).

VERIFY: grep -rn "design-system-store" components stores lib hooks app nodes must return nothing; grep -n "readDesignInjectCookie" components/modals/DesignSystemModal.tsx must match; the file stores/design-system-store.ts must not exist.
