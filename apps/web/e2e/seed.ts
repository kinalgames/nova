// E2e boot helpers — the product is local-first: a signed-in device restores
// its state from localStorage, so e2e seeds the SAME showcase slice the unit
// fixture uses and lets the app tolerate the unreachable API (no backend in
// e2e). Chat streams are fulfilled at the network layer per test.

import type { Page } from '@playwright/test'
import { fromLinear } from '../src/state/thread'
import {
  showcaseConvs,
  showcaseProfiles,
  showcaseProjects,
  showcaseThreads,
} from '../src/test/showcase'

/** keep in sync with src/state/persist.ts PERSIST_KEY (importing it would
 *  drag the i18n runtime into the Playwright process) */
const PERSIST_KEY = 'nova.flow.settings.v5'

function persistedShowcase(): string {
  return JSON.stringify({
    accountId: 'e2e-user',
    userName: 'Thành Trần',
    userEmail: 'thanh@kinal.co',
    assistantName: 'Nova',
    activeConv: 'c1',
    conversations: showcaseConvs.map((c, i) => ({
      ...c,
      updatedAt: Date.now() - [2, 26, 96, 290][i % 4] * 3_600_000,
    })),
    threads: Object.fromEntries(
      Object.entries(showcaseThreads).map(([id, ms]) => [id, fromLinear(ms)]),
    ),
    profiles: showcaseProfiles,
    projects: showcaseProjects,
  })
}

/** Sign the page in and seed the showcase before the app boots. */
export async function seedApp(page: Page) {
  await page.addInitScript(
    ([key, state]) => {
      localStorage.setItem('nova.auth.token', 'e2e-token')
      localStorage.setItem(key, state)
    },
    [PERSIST_KEY, persistedShowcase()] as [string, string],
  )
}

/** Fulfil POST /v1/chat with one deterministic Nova-contract SSE reply and
 *  capture each request body for assertions. */
export async function mockChat(page: Page, reply = 'Nova đã nhận. Mình xử lý ngay đây.') {
  const requests: { system?: string; messages?: unknown[] }[] = []
  await page.route('**/v1/chat', async (route) => {
    requests.push(route.request().postDataJSON() as { system?: string })
    const frames =
      `data: ${JSON.stringify({ type: 'block_delta', text: reply })}\n\n` +
      `data: ${JSON.stringify({ type: 'message_stop', usage: { inputTokens: 10, outputTokens: 6 } })}\n\n`
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: frames,
    })
  })
  return requests
}
