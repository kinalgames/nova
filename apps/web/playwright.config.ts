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
  projects: [
    // desktop truth — the mobile spec drives touch-only UI, skip it here
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    // mobile truth — real layout, z-index and touch semantics jsdom cannot
    // see. Pixel 7 = chromium-based, so CI needs no extra browser download
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
