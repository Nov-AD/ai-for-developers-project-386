import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // Bind IPv4 loopback so pitchfork's readiness probe on 127.0.0.1:5173
    // succeeds, and fail instead of silently moving to another port.
    host: '127.0.0.1',
    strictPort: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.ts'
  }
})
