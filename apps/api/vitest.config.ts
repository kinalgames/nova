import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./src/test/cloudflare-workers-stub.ts', import.meta.url),
      ),
    },
  },
})
