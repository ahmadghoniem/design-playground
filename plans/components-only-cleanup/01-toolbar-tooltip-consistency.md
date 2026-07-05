Stack: TypeScript + React 18 (Vite host). Key file: components/canvas/PlaygroundCanvasToolbar.tsx. Reference: components/canvas/ShapeToolGroup.tsx (already uses the target pattern).

TASK: Replace the four native `title=` tooltips in the toolbar with the project's custom Tooltip components, so every toolbar button uses the same tooltip style as ShapeToolGroup. Purely mechanical, no design decision.

DETAILS — components/canvas/PlaygroundCanvasToolbar.tsx:
1. Import `Tooltip`, `TooltipContent`, `TooltipTrigger` from `../ui/tooltip`.
2. Wrap each of the four buttons that currently have a `title=` attribute (sidebar toggle, select, text, image) in:
   ```
   <Tooltip>
     <TooltipTrigger asChild>{button}</TooltipTrigger>
     <TooltipContent side="right">{label}</TooltipContent>
   </Tooltip>
   ```
   using the exact same structure ShapeToolGroup.tsx uses.
3. Tooltip copy — reuse the existing `title` text verbatim: "Toggle sidebar", "Select (V)", "Text (T)", "Image".
4. Delete the `title=` props once each is replaced.

CONSTRAINTS:
- Do not change button icons, order, `onClick`, or any other behavior.
- Match ShapeToolGroup's markup/formatting exactly.

VERIFY:
- `grep -n "title=" components/canvas/PlaygroundCanvasToolbar.tsx` no longer matches those four buttons.
- Hovering any toolbar button (these four + the shape tools) shows the same custom tooltip on the right.
