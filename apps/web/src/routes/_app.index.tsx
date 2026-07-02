import { createFileRoute, redirect } from '@tanstack/react-router'
import { lastOpenConvId, PERSIST_KEY } from '../state/persist'

/**
 * The app entry redirects to the last-opened conversation (continuity), read
 * straight from the persisted slice so it works before React mounts. A fresh
 * account has no conversations yet — it lands on the greeting at `/new`.
 */
export const Route = createFileRoute('/_app/')({
  beforeLoad: () => {
    const convId = lastOpenConvId(PERSIST_KEY)
    if (!convId) throw redirect({ to: '/new' })
    throw redirect({ to: '/chat/$convId', params: { convId } })
  },
})
