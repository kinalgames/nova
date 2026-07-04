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
import { showcaseFixture } from './fixture'

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
  /** 'real' opts out of the showcase fixture (bare store: sync/auth/boot tests) */
  world?: 'real'
}

/** auth/onboarding/share screens are their own logged-out context — the
 * signed-in fixture (data + token) would trip their guards */
const AUTH_PATHS = ['/login', '/signup', '/onboarding', '/oauth-done', '/share']
const isAuthPath = (path: string) =>
  AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`))

/**
 * Render the full routed app at a URL. Awaits the router's initial load so the
 * matched route (and the store inside the root layout) is mounted synchronously
 * before the test interacts. `drive` runs once against the live store after
 * mount (for ephemeral actions like opening a preview).
 *
 * Default world = a signed-in user with configured providers browsing the
 * showcase fixture (test/fixture.ts). Pass `world: 'real'` for a bare store.
 */
export async function renderApp(drive?: (store: Store) => void, opts: AppOpts = {}) {
  let captured: Store | null = null
  const path = opts.path ?? '/chat/c1'
  const fixtureWorld = opts.world !== 'real' && !isAuthPath(path)
  const storeInit = fixtureWorld ? { ...showcaseFixture(), ...opts.storeInit } : opts.storeInit
  // the fixture user is signed in — a token keeps the /_app auth guard happy.
  // Never clobber a token the test set itself (preview-auth asserts its own).
  if (fixtureWorld && !localStorage.getItem('nova.auth.token'))
    localStorage.setItem('nova.auth.token', 'test-token')
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
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
        initial={showcaseFixture()}
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
