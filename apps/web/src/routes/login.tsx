import { useEffect } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { adoptSocialSession, fetchMe, getToken } from '../services/auth'
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
    void adoptSocialSession().then(async (adopted) => {
      if (!adopted) return
      /* v8 ignore start — hard navigation, not reachable from the unit env */
      // a null assistantName means this account never completed onboarding —
      // route the first social sign-in through it exactly once (D2)
      const me = await fetchMe()
      window.location.replace(me && me.assistantName === null ? '/onboarding' : '/')
      /* v8 ignore stop */
    })
  }, [])
  return <Auth />
}
