import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind IPv4 loopback so pitchfork's readiness probe on 127.0.0.1:5173
    // succeeds, and fail instead of silently moving to another port.
    host: '127.0.0.1',
    strictPort: true
  }
})
