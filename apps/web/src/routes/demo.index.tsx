import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEMO_PERSIST_KEY, lastOpenConvId } from '../state/persist'

/** /demo reopens the last demo conversation; the seeded `c1` is always valid */
export const Route = createFileRoute('/demo/')({
  beforeLoad: () => {
    const convId = lastOpenConvId(DEMO_PERSIST_KEY) ?? 'c1'
    throw redirect({ to: '/demo/chat/$convId', params: { convId } })
  },
})
