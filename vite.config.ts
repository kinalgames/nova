import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// build fingerprint: baked into the bundle (define) AND emitted as
// /version.json so a running client can detect that a newer deploy exists
const buildId = Date.now().toString(36)

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    // must precede @vitejs/plugin-react so generated route modules are
    // transformed by the React plugin afterwards. Per-route code splitting keeps
    // the initial bundle lean (unit tests run via vitest.config.ts, which omits
    // this plugin, so route components stay eager there).
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    {
      name: 'nova-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ build: buildId }),
        })
      },
    },
  ],
  server: {
    // allow the Dockerized preview/test harness to reach the dev server by its
    // host alias (the container hits the host via host.docker.internal)
    allowedHosts: ['host.docker.internal'],
  },
})
