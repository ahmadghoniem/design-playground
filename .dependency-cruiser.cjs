// Dependency-cruiser boundary enforcement for design-playground.
// Resolves `@pg/` via tsConfig `paths`. Dev-time tool only — NOT in package.json.
// Run via: `bun run check:boundaries` (see package.json scripts).
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // NOTE: `@pg/*` imports are NOT resolved to file paths by the cruiser's
    // resolver (they stay as literal `@pg/...` module names), so every
    // boundary rule below exists in two forms: one matching resolved relative
    // paths, and one matching the raw alias specifier. Without the alias form
    // the rules are false passes — cross-feature imports use `@pg/` by
    // convention and would never match `^features/`.
    {
      name: 'no-feature-to-feature',
      comment:
        'A feature must not import another feature. Cross-feature composition happens in app/.',
      severity: 'error',
      from: { path: '^features/([^/]+)/' },
      to: {
        path: '^features/([^/]+)/',
        pathNot: '^features/$1/',
      },
    },
    {
      name: 'no-feature-to-feature-alias',
      comment:
        'Alias form of no-feature-to-feature: catches `@pg/features/X` imports from features/Y.',
      severity: 'error',
      from: { path: '^features/([^/]+)/' },
      to: {
        path: '^@pg/features/([^/]+)',
        pathNot: '^@pg/features/$1(/|$)',
      },
    },
    {
      name: 'shared-no-features-or-app',
      comment: 'shared/ must never import from features/ or app/.',
      severity: 'error',
      from: { path: '^shared/' },
      to: { path: '^(features|app)/' },
    },
    {
      name: 'shared-no-features-or-app-alias',
      comment: 'Alias form: shared/ must never import `@pg/features` or `@pg/app`.',
      severity: 'error',
      from: { path: '^shared/' },
      to: { path: '^@pg/(features|app)/' },
    },
    {
      name: 'server-no-features',
      comment:
        'server/ must not import from features/. Prompts and client feature code belong behind shared/ or stay server-local.',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^features/' },
    },
    {
      name: 'server-no-alias',
      comment:
        'server/ must use relative imports only (bun server/index.ts resolves without a bundler) — no `@pg/` at all.',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^@pg/' },
    },
    {
      name: 'no-circular',
      comment: 'No circular dependencies.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules' },
  },
};
