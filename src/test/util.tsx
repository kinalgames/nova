import { useEffect, useRef, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider, useStore, type Store } from '../state/store'

/** userEvent without the realistic inter-event delay — same behaviour, faster. */
export const makeUser = () => userEvent.setup({ delay: null, pointerEventsCheck: 0 })

/** Runs a callback against the store once on mount (to drive it into a state). */
export function Drive({ on }: { on: (store: Store) => void }) {
  const store = useStore()
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    on(store)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/** Render UI inside the store, optionally driving it to a state first. */
export function renderWithStore(ui: ReactNode, drive?: (store: Store) => void) {
  return render(
    <StoreProvider>
      {drive && <Drive on={drive} />}
      {ui}
    </StoreProvider>,
  )
}
