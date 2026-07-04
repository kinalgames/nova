import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedApp } from './seed'

// Contrast on a handful of small brand-coloured labels (accent/success/danger
// on tinted chips) is tracked separately: fixing it properly needs dedicated
// *-text colour variants, a brand decision. Everything else is hard-gated at 0.
const CONTRAST_BASELINE = 6

test('app shell: no structural a11y violations; contrast within baseline', async ({ page }) => {
  await seedApp(page)
  await page.goto('/')
  await page.waitForSelector('#root > div')

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')

  const contrast = serious.filter((v) => v.id === 'color-contrast')
  const structural = serious.filter((v) => v.id !== 'color-contrast')

  if (structural.length) {
    console.log(
      'structural a11y violations:\n' +
        structural.map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`).join('\n'),
    )
  }
  const contrastNodes = contrast.reduce((n, v) => n + v.nodes.length, 0)
  console.log(`color-contrast nodes: ${contrastNodes} (baseline ${CONTRAST_BASELINE})`)

  // hard gate: structural issues (missing names, roles, keyboard access)
  expect(structural).toEqual([])
  // ratchet: contrast must not regress past the tracked baseline
  expect(contrastNodes).toBeLessThanOrEqual(CONTRAST_BASELINE)
})
