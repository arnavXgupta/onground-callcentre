import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './dev/api-plugin.ts'

export default defineConfig({
  plugins: [react(), apiPlugin()],
  // Twilio reaches the dev server through ngrok.
  server: { allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
