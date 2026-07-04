import { type ReactNode } from 'react'
import { render, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'
import { StoreProvider, type Store } from '../state/store'
import type { Message, NovaState } from '../state/types'
import { demoFixture } from './fixture'

/** the concatenated text of a message's text blocks (test convenience) */
export const msgText = (m?: Message) =>
  (m?.blocks.find((b) => b.type === 'text') as { text: string } | undefined)?.text ?? ''

/** userEvent without the realistic inter-event delay — same behaviour, faster. */
export const makeUser = () => userEvent.setup({ delay: null, pointerEventsCheck: 0 })

interface AppOpts {
  /** initial URL — the single source of truth for view/conversation/auth/settings */
  path?: string
  /** seed ephemeral UI state that has no URL (sidebarCollapsed, quiet, advanced…) */
  storeInit?: Partial<NovaState>
  /** 'real' opts out of the demo-tree default (for sync/auth/product-boot tests) */
  world?: 'demo' | 'real'
}

/** auth/onboarding screens live in the real world; everything else the unit
 * suite exercises is the seeded showcase — the demo tree */
const REAL_WORLD = ['/login', '/signup', '/onboarding', '/oauth-done', '/share']
const isRealWorld = (path: string) =>
  REAL_WORLD.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`))
const demoPath = (path: string) =>
  path.startsWith('/demo') || isRealWorld(path) ? path : `/demo${path === '/' ? '' : path}`

/**
 * Render the full routed app at a URL. Awaits the router's initial load so the
 * matched route (and the store inside the root layout) is mounted synchronously
 * before the test interacts. `drive` runs once against the live store after
 * mount (for ephemeral actions like opening a preview).
 */
export async function renderApp(drive?: (store: Store) => void, opts: AppOpts = {}) {
  let captured: Store | null = null
  const path = opts.path ?? '/chat/c1'
  // world resolution:
  //  'real'    → the real route tree, caller-supplied state only
  //  'demo'    → the /demo tree (kept for the few demo-specific tests)
  //  default   → the real route tree seeded with the showcase FIXTURE, so the
  //              suite no longer depends on the demo runtime (Phase B)
  const entry = opts.world === 'demo' ? demoPath(path) : path
  // auth/onboarding/share screens are their OWN real, logged-out context — the
  // signed-in fixture (data + token) makes no sense there and would trip the
  // guards, so those paths get the bare real tree even under the default world
  const authPath = isRealWorld(path)
  const fixtureWorld = opts.world !== 'real' && opts.world !== 'demo' && !authPath
  const storeInit = fixtureWorld ? { ...demoFixture(), ...opts.storeInit } : opts.storeInit
  // the fixture world is a signed-in user browsing their real conversations —
  // give it a token so the /_app auth guard doesn't bounce it to /login. Never
  // clobber a token the test set itself (a preview-auth test asserts its own).
  if (fixtureWorld && !localStorage.getItem('nova.auth.token'))
    localStorage.setItem('nova.auth.token', 'test-token')
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entry] }),
    context: {
      storeInit,
      onStore: (s: Store) => {
        captured = s
      },
    },
  })
  await router.load()
  const utils = render(<RouterProvider router={router} />)
  if (drive) act(() => drive(captured as Store))
  return { ...utils, router, store: () => captured as Store }
}

/** renderHook-style access to the live store, wrapped in a memory router. */
export async function renderStore(opts: AppOpts = {}) {
  const handle = await renderApp(undefined, opts)
  return {
    ...handle,
    result: {
      get current(): Store {
        return handle.store()
      },
    },
  }
}

/**
 * Render an isolated component subtree inside the store + a minimal router —
 * for component unit tests that do not exercise navigation.
 */
export async function renderWithStore(ui: ReactNode, drive?: (store: Store) => void) {
  let captured: Store | null = null
  const rootRoute = createRootRoute({
    component: () => (
      <StoreProvider
        demo
        onStore={(s) => {
          captured = s
        }}
      >
        {ui}
      </StoreProvider>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  const utils = render(<RouterProvider router={router} />)
  if (drive) act(() => drive(captured as Store))
  return { ...utils, store: () => captured as Store }
}
