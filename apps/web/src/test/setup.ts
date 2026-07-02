import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'
import i18n from '../i18n'

// tests assert Vietnamese strings — pin the locale regardless of the
// environment's navigator.language
await i18n.changeLanguage('vi')

expect.extend(axeMatchers)

// Unmount every rendered tree between tests. With the router in play each render
// mounts a RouterProvider + StoreProvider (global listeners, a Transitioner);
// without cleanup these accumulate across a file and corrupt later tests.
afterEach(() => cleanup())
