import { useEffect } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { adoptSocialSession, getToken } from '../services/auth'
import { Auth } from '../components/Auth'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

/**
 * Social OAuth redirects land back here with a session COOKIE but no bearer
 * token — adopt one, then hard-reload into the app so boot (fetchMe, sync,
 * credential/usage hydration) runs with the token in place. Costs one cheap
 * 401 for plain email/password visitors.
 */
function LoginPage() {
  useEffect(() => {
    void adoptSocialSession().then((adopted) => {
      /* v8 ignore next — hard navigation, not reachable from the unit env */
      if (adopted) window.location.replace('/')
    })
  }, [])
  return <Auth />
}
