import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // worker threads start faster than forks for jsdom; reusing the module
    // graph across files in a worker (isolate:false) is safe here — every file
    // clears localStorage and Testing-Library auto-unmounts after each test.
    pool: 'threads',
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Floors ratchet UP only (never down): the suite holds ≥90% on every
      // metric — branch coverage was raised to 90 deliberately (defensive
      // fallbacks, error paths and heal-on-corrupt branches all have targeted
      // tests). The remaining uncovered branches are dead-defensive lines
      // (post-filter ternaries) and render-only cosmetic forks.
      thresholds: {
        statements: 94,
        branches: 90,
        functions: 94,
        lines: 95,
      },
    },
  },
})
