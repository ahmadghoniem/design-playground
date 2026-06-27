/**
 * Pure helpers for deriving display names and registry IDs from iteration
 * file / folder data. No side effects, no React.
 *
 * The `Name.iteration-N.tsx` filename scheme must remain stable — the scanner
 * in registry.tsx and the adoption API depend on it.
 */

// ---------------------------------------------------------------------------
// Component-name → kebab registry-id
// ---------------------------------------------------------------------------

/**
 * Convert a PascalCase component name to the kebab-case registry id.
 *
 * e.g. "PricingCard" → "pricing-card"
 * e.g. "LandingHero"  → "landing-hero"
 *
 * This mirrors the inverse of `registryIdToPascalCase` in `registry.tsx` —
 * kept here so IterationNode does not need to import the full registry.
 */
export function componentNameToRegistryId(componentName: string): string {
  return componentName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

// ---------------------------------------------------------------------------
// Iteration page-name (display label, used in the node header)
// ---------------------------------------------------------------------------

/**
 * Derive the short display label for an iteration node header.
 *
 * Rules (matching IterationNode's original logic):
 *   - JSX mode: strip `.iteration-N.tsx` + `.tsx` from the jsxFile; fall
 *     back to componentName.
 *   - HTML mode: use htmlFolder; fall back to componentName.
 *   - React mode: kebab-case the componentName.
 */
export function iterationPageName(params: {
  componentName: string;
  isJsx: boolean;
  isHtml: boolean;
  jsxFile?: string;
  htmlFolder?: string;
}): string {
  const { componentName, isJsx, isHtml, jsxFile, htmlFolder } = params;
  if (isJsx) {
    return jsxFile?.replace(/\.iteration-\d+\.tsx$/, '').replace('.tsx', '') || componentName;
  }
  if (isHtml) {
    return htmlFolder || componentName;
  }
  return componentNameToRegistryId(componentName);
}

// ---------------------------------------------------------------------------
// Base-file derivation (used for adopt prompts)
// ---------------------------------------------------------------------------

/**
 * Strip the `.iteration-N.tsx` suffix from a JSX iteration filename,
 * returning the base component file.
 *
 * e.g. "Button.iteration-3.tsx" → "Button.tsx"
 */
export function jsxIterationToBaseFile(jsxFile: string): string {
  return jsxFile.replace(/\.iteration-\d+\.tsx$/, '.tsx');
}
