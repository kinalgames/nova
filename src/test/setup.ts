import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

// Unmount every rendered tree between tests. With the router in play each render
// mounts a RouterProvider + StoreProvider (global listeners, a Transitioner);
// without cleanup these accumulate across a file and corrupt later tests.
afterEach(() => cleanup())
