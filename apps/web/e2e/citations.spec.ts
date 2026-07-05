import { test, expect } from '@playwright/test'
import { seedApp } from './seed'

// Citations E2E — a real provider stream (tool_result carrying a numbered
// source + a citation event anchored into the reply) renders as an inline
// marker linking to the source, AND the sources block collapses into one
// "N nguồn" trigger listing it with a resolved title.

test.beforeEach(async ({ page }) => seedApp(page))

test('a cited reply shows an inline marker linking to the source, and the sources trigger lists it', async ({
  page,
}) => {
  // the favicon proxy is a real network hop in prod — stub it in e2e so the
  // hover preview never depends on (or waits on) an outbound request
  await page.route('**/v1/favicon**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from([]) }),
  )
  await page.route('**/v1/chat', async (route) => {
    const frames = [
      { type: 'tool_start', id: 't1', name: 'web_search' },
      { type: 'tool_delta', id: 't1', text: '{"query":"giá vàng hôm nay"}' },
      {
        type: 'tool_result',
        id: 't1',
        ok: true,
        sources: [{ n: 1, url: 'https://example.com/gia-vang', title: 'Giá vàng hôm nay' }],
      },
      { type: 'block_delta', text: 'Giá vàng hôm nay tăng nhẹ.' },
      // "Giá vàng hôm nay" is the first 16 characters of the reply above
      { type: 'citation', citeStart: 0, citeEnd: 16, citeSource: 1 },
      { type: 'message_stop', usage: { inputTokens: 10, outputTokens: 6 } },
    ]
    const body = frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join('')
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
  })

  await page.goto('/chat/c3')
  await page.getByRole('textbox', { name: 'Nhắn cho Nova' }).fill('giá vàng hôm nay thế nào')
  await page.keyboard.press('Enter')

  // the cited span reads naturally, with a numbered marker linking to the source
  const marker = page.getByRole('link', { name: 'Giá vàng hôm nay' })
  await expect(marker).toBeVisible({ timeout: 15_000 })
  await expect(marker).toHaveAttribute('href', 'https://example.com/gia-vang')
  await expect(page.getByText('tăng nhẹ.')).toBeVisible()

  // the flat chip row is gone — one trigger, opened to reveal the real title
  const trigger = page.getByRole('button', { name: '1 nguồn' })
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.getByText('example.com')).toBeVisible()
})
