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
      thresholds: {
        statements: 95,
        branches: 91,
        functions: 95,
        lines: 96,
      },
    },
  },
})
