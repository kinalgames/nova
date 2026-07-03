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
    // worker threads start faster than forks for jsdom. Isolation stays ON:
    // sharing the module graph across files (isolate:false) silently disables
    // vi.mock for any module a previous file in the worker already imported —
    // invisible on a 32-core dev box (one file per worker) but 16 tests failed
    // on 2-core CI. Correctness beats the ~seconds saved.
    pool: 'threads',
    isolate: true,
    // Under coverage instrumentation on loaded machines, the FIRST test of a
    // file pays the whole import/transform bill and regularly blows the 5s
    // default — a recurring pure-flake class (every isolated rerun passes).
    // 15s does not mask real hangs: genuine regressions still fail loudly.
    testTimeout: 15_000,
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
