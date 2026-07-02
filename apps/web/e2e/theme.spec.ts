import { test, expect } from '@playwright/test'

// Dark mode is a class over runtime tokens — these specs assert the ACTUAL
// computed values so a broken token mapping can never ship silently.

test('dark mode flips the interaction tokens (hover wash, scrim)', async ({ page }) => {
  await page.goto('/demo/chat/c1?settings=general')
  await page.getByRole('button', { name: 'Tối' }).click()
  const tokens = await page.evaluate(() => {
    const el = document.querySelector('.dark') ?? document.documentElement
    const cs = getComputedStyle(el)
    return {
      hover: cs.getPropertyValue('--hover-1').trim(),
      scrim: cs.getPropertyValue('--scrim').trim(),
      bg: cs.getPropertyValue('--bg').trim(),
    }
  })
  // the highlight wash must be WHITE-based in the dark (black was invisible)
  expect(tokens.hover).toContain('255, 255, 255')
  expect(tokens.scrim).toContain('0, 0, 0')
  expect(tokens.bg).toBe('#16130f')
})

test('fonts are self-hosted — zero third-party font requests', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    if (/fonts\.googleapis|fonts\.gstatic/i.test(r.url())) external.push(r.url())
  })
  await page.goto('/demo/chat/c1')
  await expect(page.getByText('Đối chiếu benchmark đối thủ').first()).toBeVisible()
  expect(external).toHaveLength(0)
  // the display serif actually loaded from our own origin
  const fraunces = await page.evaluate(async () => {
    await document.fonts.ready
    return document.fonts.check('22px Fraunces')
  })
  expect(fraunces).toBe(true)
})

test('the sidebar marks the open conversation with aria-current', async ({ page }) => {
  await page.goto('/demo/chat/c1')
  const current = page.locator('aside [aria-current="page"]')
  await expect(current).toHaveCount(1)
  await expect(current).toContainText('Đối chiếu benchmark đối thủ')
  // navigating moves the marker
  await page.locator('aside').getByRole('link', { name: 'Lịch nội dung 6 tuần' }).click()
  await expect(page.locator('aside [aria-current="page"]')).toContainText('Lịch nội dung 6 tuần')
})
