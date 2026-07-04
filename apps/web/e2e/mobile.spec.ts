import { test, expect } from '@playwright/test'

// Mobile-truth guards — the class of bugs jsdom can never see: real layout,
// stacking contexts and touch semantics. Runs emulated iPhone (hasTouch +
// isMobile, 390×844). Every test here encodes a shipped regression.

test('drawer conversation menu sits ABOVE the scrim and its items accept taps', async ({
  page,
}) => {
  await page.goto('/demo/chat/c1')
  await page.getByRole('button', { name: 'Mở menu' }).tap()
  await page
    .locator('[role=dialog] button[aria-label="Tùy chọn cuộc trò chuyện"]')
    .first()
    .tap()
  const menu = page.locator('[role=menu]')
  await expect(menu).toBeVisible()
  // Playwright refuses the tap when ANY overlay intercepts the point — this
  // line alone guards the popover-vs-scrim z-order (menu z-80 > scrim z-48)
  await menu.locator('[role=menuitem]').filter({ hasText: 'Ghim lên đầu' }).tap({ timeout: 4000 })
  await expect(menu).not.toBeVisible()
  // the action really executed: the row now carries the pin glyph
  await expect(page.locator('[role=dialog] a svg').first()).toBeVisible()
})

test('tapping a conversation navigates and closes the drawer', async ({ page }) => {
  await page.goto('/demo/chat/c1')
  await page.getByRole('button', { name: 'Mở menu' }).tap()
  await page.locator('[role=dialog] a[href*="/chat/c2"]').tap()
  await expect(page).toHaveURL(/\/demo\/chat\/c2$/)
  await expect(page.locator('[role=dialog]')).not.toBeVisible()
})

test('touch geometry: 44px tap boxes with centered icons, compact conv rows', async ({
  page,
}) => {
  await page.goto('/demo/chat/c1')
  const centered = async (btn: ReturnType<typeof page.locator>) => {
    const b = (await btn.boundingBox())!
    const s = (await btn.locator('svg').boundingBox())!
    // icon sits optically centered: left/right and top/bottom insets match
    expect(Math.abs(s.x - b.x - (b.x + b.width - (s.x + s.width)))).toBeLessThan(3)
    expect(Math.abs(s.y - b.y - (b.y + b.height - (s.y + s.height)))).toBeLessThan(3)
    return b
  }
  const ham = page.getByRole('button', { name: 'Mở menu' })
  const hb = await centered(ham)
  expect(hb.width).toBeGreaterThanOrEqual(44)
  expect(hb.height).toBeGreaterThanOrEqual(44)

  await ham.tap()
  const close = page.getByRole('button', { name: 'Đóng' })
  await expect(close).toBeVisible()
  // let the drawer's 200ms slide-in settle — boundingBox mid-animation lies
  await page.waitForTimeout(400)
  const cb = await centered(close)
  expect(cb.width).toBeGreaterThanOrEqual(44)

  // conversation rows: compact list, still a full-height touch target
  const row = page.locator('[role=dialog] a[href*="/chat/"]').first()
  const rb = (await row.boundingBox())!
  expect(rb.height).toBeGreaterThanOrEqual(36)
  expect(rb.height).toBeLessThanOrEqual(48)
})

test('no overlay steals taps from visible controls (top bar, then open drawer)', async ({
  page,
}) => {
  await page.goto('/demo/chat/c1')
  // evaluate() has no auto-wait — anchor on a rendered control first
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible()
  // every visible control inside the root must be hit at its own center —
  // catches z-index / pointer-events regressions mechanically
  const audit = (root: string) =>
    page.evaluate((sel) => {
      const scope = document.querySelector(sel)
      if (!scope) return [`missing root ${sel}`]
      const bad: string[] = []
      for (const el of scope.querySelectorAll<HTMLElement>('button, a[href]')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.bottom < 0 || r.top > innerHeight) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.pointerEvents === 'none')
          continue
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        if (hit && !el.contains(hit) && !hit.contains(el))
          bad.push(
            `${el.tagName}[${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 20)}] covered by ${hit.tagName}.${(hit.className as string).toString().slice(0, 40)}`,
          )
      }
      return bad
    }, root)
  expect(await audit('.h-14')).toEqual([])
  await page.getByRole('button', { name: 'Mở menu' }).tap()
  await page.waitForTimeout(350)
  expect(await audit('[role=dialog]')).toEqual([])
})

test('drawer delete shows a tappable undo that restores the row', async ({ page }) => {
  await page.goto('/demo/chat/c1')
  await page.getByRole('button', { name: 'Mở menu' }).tap()
  const rows = page.locator('[role=dialog] a[href*="/chat/"]')
  const before = await rows.count()
  await page.locator('[role=dialog] button[aria-label="Tùy chọn cuộc trò chuyện"]').nth(1).tap()
  await page.locator('[role=menuitem]').filter({ hasText: 'Xóa' }).tap()
  const undo = page.locator('[role=dialog] button').filter({ hasText: 'Hoàn tác' })
  await expect(undo).toBeVisible()
  const b = (await undo.boundingBox())!
  expect(b.height).toBeGreaterThanOrEqual(36) // full-height touch target
  await undo.tap()
  await expect(rows).toHaveCount(before)
})

test('composer thinking menu opens ABOVE everything and the lightbox round-trips', async ({
  page,
}) => {
  await page.goto('/demo/chat/c1')
  await page.getByRole('button', { name: /Mức suy nghĩ/ }).tap()
  const menu = page.locator('[role=menu]')
  await expect(menu).toBeVisible()
  // popover layer must own its own pixels (z-80 over any surface)
  const owns = await page.evaluate(() => {
    const m = document.querySelector('[role=menu]')!
    const r = m.getBoundingClientRect()
    return m.contains(document.elementFromPoint(r.x + 10, r.y + 10))
  })
  expect(owns).toBe(true)
  await page.keyboard.press('Escape')
  // attachment preview lightbox opens and closes cleanly
  await page.getByRole('button', { name: /Mở moodboard/ }).tap()
  await expect(page.locator('.bg-scrim-lightbox')).toBeVisible()
  await page.getByRole('button', { name: 'Đóng' }).last().tap()
  await expect(page.locator('.bg-scrim-lightbox')).not.toBeVisible()
})
