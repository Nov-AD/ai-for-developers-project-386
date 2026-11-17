import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: '../contract/tsp-output/openapi3/openapi.yaml',
  output: {
    path: 'src',
    clean: true
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    { name: 'zod', exportFromIndex: true },
    { name: '@tanstack/react-query', exportFromIndex: true },
    {
      name: '@hey-api/client-fetch',
      // Re-export `client` from the package entry point so apps can call
      // `client.setConfig({ baseUrl })` without deep imports.
      exportFromIndex: true
    }
  ]
})
