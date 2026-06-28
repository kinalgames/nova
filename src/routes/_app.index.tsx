import { createFileRoute, redirect } from '@tanstack/react-router'
import { PERSIST_KEY } from '../state/store'

/**
 * The app entry redirects to the last-opened conversation (continuity), read
 * straight from the persisted slice so it works before React mounts. Falls back
 * to the first persisted conversation, then the seeded demo `c1` (always valid).
 * The greeting / new-chat landing lives at `/new`.
 */
export const Route = createFileRoute('/_app/')({
  beforeLoad: () => {
    let convId = 'c1'
    try {
      const raw = localStorage.getItem(PERSIST_KEY)
      if (raw) {
        const p = JSON.parse(raw) as {
          conversations?: { id: string }[]
          activeConv?: string
        }
        const known = p.conversations
        if (p.activeConv && (!known || known.some((c) => c.id === p.activeConv))) {
          convId = p.activeConv
        } else if (known && known[0]) {
          convId = known[0].id
        }
      }
    } catch {
      /* fall back to the seeded conversation */
    }
    throw redirect({ to: '/chat/$convId', params: { convId } })
  },
})
