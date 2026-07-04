import { test, expect } from '@playwright/test'

// The product requires a session (like ChatGPT/Claude). The gate is
// token-only — no network round-trip.

test('the app requires a session — every app URL bounces to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/chat/anything')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
})

test('the login screen offers social and email sign-in', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Tiếp tục với Google')).toBeVisible()
  await expect(page.getByText('Tiếp tục với GitHub')).toBeVisible()
  await expect(page.getByPlaceholder('Email')).toBeVisible()
})

test.describe('english browser', () => {
  test.use({ locale: 'en-US' })
  test('the login screen localizes to english', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })
})

test('a stored session enters the real app and lands on the greeting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nova.auth.token', 'e2e-tok'))
  await page.goto('/')
  await expect(page).toHaveURL(/\/new$/)
  // clean boot: no conversations yet, the sidebar invites instead
  await expect(page.getByText('Chưa có cuộc trò chuyện nào.')).toBeVisible()
})
