# How we work

## How we work on specs

1. Specs live in `.claude/specs/`, audited with Fable and locked before any code is generated.
2. `00-cleanup-preliminary` (Base UI + cnfast + de-arbitrary Tailwind) lands on `master` first —
   commit and push — then `master` is the base for everything after it.
3. One branch per spec, pushed when it lands. Independent features branch off `master` and merge on
   their own. Stack a spec on another only on a real code dependency, to avoid the rebase churn of
   a long linear stack.
4. The prototype is the UI-alignment gate — clear it before implementing a spec whose UI is still
   moving.
5. Each spec is iterated with Fable, nothing taken for granted. The right design panel collects
   multiple references and goes back and forth until its UI is definite.
