import { createFileRoute, redirect } from '@tanstack/react-router'
import { getToken } from '../services/auth'
import { Auth } from '../components/Auth'

export const Route = createFileRoute('/signup')({
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: '/' })
  },
  component: Auth,
})
