import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { Store } from './state/store'
import type { NovaState } from './state/types'

/**
 * Dependencies injected through the router so the root layout can build the
 * store. In production both fields are absent; tests pass `storeInit` to seed
 * ephemeral UI state and `onStore` to capture the live store for assertions.
 */
export interface RouterContext {
  storeInit?: Partial<NovaState>
  onStore?: (store: Store) => void
}

export const router = createRouter({
  routeTree,
  context: {} as RouterContext,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
