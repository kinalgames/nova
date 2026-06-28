import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useStore } from '../state/store'
import { ConversationView } from '../views/ConversationView'

export const Route = createFileRoute('/_app/chat/$convId')({
  component: ChatRoute,
})

function ChatRoute() {
  const { convId } = Route.useParams()
  const { s } = useStore()
  // a deep link to a conversation that does not exist (deleted, or a bad URL)
  // bounces to the greeting rather than rendering an empty, dead conversation
  if (!s.conversations.some((c) => c.id === convId)) {
    return <Navigate to="/new" replace />
  }
  return <ConversationView />
}
