import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // must precede @vitejs/plugin-react so generated route modules are
    // transformed by the React plugin afterwards. Per-route code splitting keeps
    // the initial bundle lean (unit tests run via vitest.config.ts, which omits
    // this plugin, so route components stay eager there).
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: {
    // allow the Dockerized preview/test harness to reach the dev server by its
    // host alias (the container hits the host via host.docker.internal)
    allowedHosts: ['host.docker.internal'],
  },
})
