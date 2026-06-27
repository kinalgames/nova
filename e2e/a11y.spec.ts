import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Smoke-level accessibility gate. As controls are migrated to Radix +
// semantic elements, tighten this from "serious/critical" toward zero.
test('app shell has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('#root > div')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )

  if (blocking.length) {
    console.log(
      'a11y violations:\n' +
        blocking.map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`).join('\n'),
    )
  }
  expect(blocking).toEqual([])
})
