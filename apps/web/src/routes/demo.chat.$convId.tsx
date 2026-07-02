import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useStore } from '../state/store'
import { ConversationView } from '../views/ConversationView'

export const Route = createFileRoute('/demo/chat/$convId')({
  component: DemoChatRoute,
})

function DemoChatRoute() {
  const { convId } = Route.useParams()
  const { s } = useStore()
  if (!s.conversations.some((c) => c.id === convId)) {
    return <Navigate to="/demo/new" replace />
  }
  return <ConversationView />
}
