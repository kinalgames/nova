import { createFileRoute } from '@tanstack/react-router'
import { Auth } from '../components/Auth'

export const Route = createFileRoute('/onboarding')({
  component: Auth,
})
