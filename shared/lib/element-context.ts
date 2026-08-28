export interface ElementContext {
  tagName: string;
  displayName: string;
  textContent: string;
  attributes: Record<string, string>;
  cssSelector: string;
  ancestorComponents: string[];
  htmlSource: string;
}

export interface SelectedElement {
  element: HTMLElement;
  context: ElementContext;
  nodeId: string;
  componentName: string;
}

function getReactFiber(el: HTMLElement): unknown | null {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  if (!key) return null;
  return (el as unknown as Record<string, unknown>)[key] ?? null;
}

/**
 * Resolve a fiber `type` to a component name. Checks `displayName` first (shadcn,
 * forwardRef and memo wrappers set it), then a plain function's `name`, then
 * unwraps `forwardRef` (`.render`) and `memo` (`.type`) so those don't resolve to
 * an ancestor's name. Host types (a string like `'div'`) return null.
 */
function resolveTypeName(type: unknown): string | null {
  if (!type || typeof type === 'string') return null;
  const displayName = (type as { displayName?: unknown }).displayName;
  if (typeof displayName === 'string' && displayName) return displayName;
  if (typeof type === 'function') return (type as { name?: string }).name || null;
  const render = (type as { render?: unknown }).render;
  if (render) return resolveTypeName(render);
  const inner = (type as { type?: unknown }).type;
  if (inner) return resolveTypeName(inner);
  return null;
}

export function getReactComponentName(el: HTMLElement): string | null {
  let fiber = getReactFiber(el) as Record<string, unknown> | null;
  while (fiber) {
    const name = resolveTypeName(fiber.type);
    // Skip React internals and styled/lowercase wrappers
    if (name && !name.startsWith('_') && name[0] === name[0].toUpperCase()) {
      return name;
    }
    fiber = fiber.return as Record<string, unknown> | null;
  }
  return null;
}

function getAncestorComponents(el: HTMLElement, maxDepth = 10): string[] {
  const components: string[] = [];
  let current = el.parentElement;
  let depth = 0;

  while (current && depth < maxDepth) {
    const name = getReactComponentName(current);
    if (name && !components.includes(name)) {
      components.push(name);
    }
    current = current.parentElement;
    depth++;
  }

  return components;
}

const MEANINGFUL_ATTRS = ['className', 'id', 'role', 'aria-label', 'href', 'src', 'type', 'placeholder'];

function getMeaningfulAttributes(el: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of MEANINGFUL_ATTRS) {
    const domAttr = attr === 'className' ? 'class' : attr;
    const value = el.getAttribute(domAttr);
    if (value) attrs[attr === 'class' ? 'className' : attr] = value;
  }
  return attrs;
}

function buildCssSelector(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id;
  if (id) return `${tag}#${id}`;

  const classes = Array.from(el.classList).slice(0, 3).join('.');
  return classes ? `${tag}.${classes}` : tag;
}

export function extractElementContext(el: HTMLElement): ElementContext {
  const tagName = el.tagName.toLowerCase();
  const displayName = getReactComponentName(el) || tagName;
  const rawText = (el.innerText || '').trim();
  const textContent = rawText.length > 150 ? rawText.slice(0, 150) + '…' : rawText;
  const attributes = getMeaningfulAttributes(el);
  const cssSelector = buildCssSelector(el);
  const ancestorComponents = getAncestorComponents(el);
  const rawHtml = el.outerHTML;
  const htmlSource = rawHtml.length > 500 ? rawHtml.slice(0, 500) + '…' : rawHtml;

  return {
    tagName,
    displayName,
    textContent,
    attributes,
    cssSelector,
    ancestorComponents,
    htmlSource,
  };
}

