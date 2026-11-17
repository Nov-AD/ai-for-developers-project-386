/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'A cycle makes the dependency graph hard to reason about and to build.',
      from: {},
      to: { circular: true }
    },
    {
      name: 'no-api-to-web',
      severity: 'error',
      comment: 'The API and the web app are separate deployables; share code through packages/.',
      from: { path: '^apps/api/' },
      to: { path: '^apps/web/' }
    },
    {
      name: 'no-web-to-api',
      severity: 'error',
      comment: 'The web app talks to the API over HTTP, not through source imports.',
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/' }
    },
    {
      name: 'no-packages-to-apps',
      severity: 'error',
      comment: 'Shared packages must not depend on an application.',
      from: { path: '^packages/' },
      to: { path: '^apps/' }
    },
    {
      name: 'no-dev-dependency-in-production',
      severity: 'error',
      comment: 'Production code may only import runtime dependencies.',
      from: { path: '^(apps|packages)/[^/]+/src/' },
      to: { dependencyTypes: ['npm-dev'] }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        '(^|/)(dist|coverage|generated|tsp-output)/',
        '^packages/sdk/src/client/',
        '^packages/sdk/src/core/',
        '\\.gen\\.ts$'
      ]
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' }
    }
  }
}
