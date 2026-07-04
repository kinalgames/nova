import { defineConfig } from 'vitest/config'

// One Vitest process fans the workspaces out IN PARALLEL — wall time
// becomes the slowest project instead of the sum of all. Each project
// keeps its own config (env, aliases, setup). Coverage stays per-workspace
// (npm run test:coverage) where the thresholds live.
export default defineConfig({
  test: {
    projects: ['apps/web', 'apps/api', 'packages/shared', 'packages/ai'],
  },
})
