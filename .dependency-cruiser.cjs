// Dependency-cruiser boundary enforcement for design-playground.
// Resolves `@pg/` via tsConfig `paths`. Dev-time tool only — NOT in package.json.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
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
      name: 'shared-no-features-or-app',
      comment: 'shared/ must never import from features/ or app/.',
      severity: 'error',
      from: { path: '^shared/' },
      to: { path: '^(features|app)/' },
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
