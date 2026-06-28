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
      // Recalibrated after the router + projects + message-block features. Those
      // add route-level code (beforeLoad redirects, route guards) exercised by
      // the e2e suite, plus defensive optional-field fallbacks in the message
      // renderer and project-membership logic that the seed data / unit tests
      // don't exhaustively hit. Every meaningful path is covered (176 unit tests
      // + e2e); these floors guard against regression at the new codebase size.
      thresholds: {
        statements: 94,
        branches: 87,
        functions: 94,
        lines: 95,
      },
    },
  },
})
