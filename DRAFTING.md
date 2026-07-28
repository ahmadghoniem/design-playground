SHADCN:
I need you to write a VERY detailed and through handoff prompt to scan everything that has to do with that UI library
for context

I am leaning towards making this for anything built with ShadcnUI as a UI library so it's a shadcnUI-first React playground.
So the very first thing is that I am going to have the prompt chat bar component that's in the middle to a sidebar chat. And on the right, I will be adding a tailwind editor (that's our main focus for now) so I can edit the visuals of a component just like Figma. However, instead of using design tokens like Figma,
I would be using the tailwind classes as a design tool. 
for instance
1. Typography & Sizing
tracking-* maps to letter-spacing (uses the typographical typesetting term "tracking").
leading-* maps to line-height (named after the physical lead strips used to space lines in manual printing).
proportional-nums / tabular-nums abstract the complex font-variant-numeric sub-properties into plain-English layouts.

2. Layout & Spacing
space-x-* / space-y-* don't exist in CSS; they generate custom margin rules targeting only the spaces between child elements via sibling selectors.
divide-x-* / divide-y-* function similarly to the space utilities, injecting border-width rules exclusively between elements.
truncate isn't a native CSS property; it bundles overflow: hidden, text-overflow: ellipsis, and white-space: nowrap into a single shorthand.

3. Visuals & Borders
rounded-* swaps the technical property name border-radius for a descriptive adjective.
shadow-* drops the "box" prefix from native CSS box-shadow.
ring-* is a completely manufactured Tailwind feature. It uses an engineered stack of box-shadow configurations to mimic a perfectly responsive outline that follows border-radius curves better than native CSS outlines.

how the dark theme is implemented there 

-- left sidebar
first of all the sidebar is going to be on the left and the floating helper widget (i'd like to know it's name in the developer space) is going to be on the right

---
