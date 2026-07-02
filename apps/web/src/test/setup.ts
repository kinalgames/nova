import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'
import i18n from '../i18n'

// tests assert Vietnamese strings — pin the locale regardless of the
// environment's navigator.language
await i18n.changeLanguage('vi')

expect.extend(axeMatchers)

// HERMETIC unit tests: nothing ever reaches a real network. A test that
// exercises fetch behaviour stubs it itself (vi.stubGlobal inside the test
// wins over this beforeEach); every unmocked call gets a fast, catchable 503
// instead of leaking I/O — CI has no wrangler on :8787, and a dev machine
// that DOES must not silently turn unit tests into integration tests.
const hermeticFetch: typeof fetch = async () =>
  new Response(JSON.stringify({ error: 'unit tests are offline' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  })
beforeEach(() => {
  vi.stubGlobal('fetch', hermeticFetch)
})

// Unmount every rendered tree between tests. With the router in play each render
// mounts a RouterProvider + StoreProvider (global listeners, a Transitioner);
// without cleanup these accumulate across a file and corrupt later tests.
afterEach(() => cleanup())
