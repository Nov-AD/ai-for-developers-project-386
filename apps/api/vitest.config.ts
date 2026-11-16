import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      // @fastify/autoload needs this flag to pick up TypeScript route files.
      FASTIFY_AUTOLOAD_TYPESCRIPT: '1'
    }
  }
})
