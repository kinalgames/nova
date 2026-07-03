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
const REAL_WORLD = ['/login', '/signup', '/onboarding', '/oauth-done']
const demoPath = (path: string) =>
  path.startsWith('/demo') || REAL_WORLD.some((p) => path === p || path.startsWith(`${p}?`))
    ? path
    : `/demo${path === '/' ? '' : path}`

/**
 * Render the full routed app at a URL. Awaits the router's initial load so the
 * matched route (and the store inside the root layout) is mounted synchronously
 * before the test interacts. `drive` runs once against the live store after
 * mount (for ephemeral actions like opening a preview).
 */
export async function renderApp(drive?: (store: Store) => void, opts: AppOpts = {}) {
  let captured: Store | null = null
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [
        opts.world === 'real' ? (opts.path ?? '/chat/c1') : demoPath(opts.path ?? '/chat/c1'),
      ],
    }),
    context: {
      storeInit: opts.storeInit,
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
