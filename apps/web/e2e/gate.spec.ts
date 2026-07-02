import { test, expect } from '@playwright/test'

// The real product requires a session (like ChatGPT/Claude); the showcase
// at /demo stays public. The gate is token-only — no network round-trip.

test('the real app requires a session — every app URL bounces to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/chat/anything')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
})

test('the login page opens the public demo world', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: /demo/i }).click()
  await expect(page).toHaveURL(/\/demo\/chat\/c1$/)
  // the demo chip offers the way back out
  await expect(page.getByText('DEMO', { exact: true })).toBeVisible()
})

test('a stored session enters the real app and lands on the greeting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nova.auth.token', 'e2e-tok'))
  await page.goto('/')
  await expect(page).toHaveURL(/\/new$/)
  // clean real boot: no demo conversations, the sidebar invites instead
  await expect(page.getByText('Chưa có cuộc trò chuyện nào.')).toBeVisible()
})
