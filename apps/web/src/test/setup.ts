import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'
import i18n from '../i18n'
import { MOCK_REPLY } from './fixture'

// tests assert Vietnamese strings — pin the locale regardless of the
// environment's navigator.language
await i18n.changeLanguage('vi')

expect.extend(axeMatchers)

/** Nova-contract SSE frames for one deterministic assistant reply — the real
 * streamChat parser consumes these, so send-tests exercise the actual client
 * streaming path end to end. */
function chatSse(): Response {
  const frames =
    `data: ${JSON.stringify({ type: 'block_delta', text: MOCK_REPLY.slice(0, 6) })}\n\n` +
    `data: ${JSON.stringify({ type: 'block_delta', text: MOCK_REPLY.slice(6) })}\n\n` +
    `data: ${JSON.stringify({ type: 'message_stop', usage: { inputTokens: 12, outputTokens: 7 } })}\n\n`
  return new Response(frames, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

// HERMETIC unit tests: nothing ever reaches a real network. POST /v1/chat gets
// a deterministic SSE reply (fixture users have providers configured, so sends
// route through the REAL streamChat); every other unmocked call gets a fast,
// catchable 503 instead of leaking I/O. A test that exercises fetch behaviour
// stubs it itself (vi.stubGlobal inside the test wins over this beforeEach).
const hermeticFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.endsWith('/v1/chat') && (init?.method ?? 'GET') === 'POST') return chatSse()
  return new Response(JSON.stringify({ error: 'unit tests are offline' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  })
}
beforeEach(() => {
  vi.stubGlobal('fetch', hermeticFetch)
})

// Unmount every rendered tree between tests. With the router in play each render
// mounts a RouterProvider + StoreProvider (global listeners, a Transitioner);
// without cleanup these accumulate across a file and corrupt later tests.
afterEach(() => cleanup())
