import { defineConfig, devices } from '@playwright/test'

// e2e + automated accessibility (axe) against a real browser.
// First run: `npx playwright install chromium`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // the suite asserts Vietnamese copy; pin the browser locale so i18n
    // first-run detection resolves to vi
    locale: 'vi-VN',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
