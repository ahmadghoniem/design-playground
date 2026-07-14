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
 * Expands the PascalCase componentName into spaced Title Case
 * (e.g. "CardComponent" → "Card Component"), preserving the original
 * name instead of kebab-lowercasing it.
 */
export function iterationPageName(params: {
  componentName: string;
}): string {
  return params.componentName.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}
