import { createFileRoute } from '@tanstack/react-router'
import { ConversationView } from '../views/ConversationView'

export const Route = createFileRoute('/_app/chat/$convId')({
  component: ConversationView,
})
