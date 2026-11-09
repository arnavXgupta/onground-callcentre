import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './dev/api-plugin.ts'

export default defineConfig({
  plugins: [react(), apiPlugin()],
  // Twilio reaches the dev server through ngrok.
  server: { port: 3000, strictPort: true, allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // One jsdom per worker is heavy: on a 16-core box the default (15 workers) oversubscribed and
    // made single tests 35x slower (full suite 37s). 4 workers: 8.5s, no slow tests.
    maxWorkers: 4,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
