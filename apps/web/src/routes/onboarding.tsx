import { createFileRoute, redirect } from '@tanstack/react-router'
import { getToken } from '../services/auth'
import { Auth } from '../components/Auth'

export const Route = createFileRoute('/onboarding')({
  // onboarding is the post-signup step — it needs the fresh session
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/login' })
  },
  component: Auth,
})
