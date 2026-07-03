// Real authentication against nova-api (Better Auth). The web keeps the
// session cookie AND stores the bearer token so /v1/* calls (and future
// native clients) authenticate the same way. No API_BASE → demo mode.

import { API_BASE } from './llm'
import { getToken, TOKEN_KEY } from './token'
import i18n from '../i18n'

export { getToken } from './token'

export interface SessionUser {
  id: string
  name: string
  email: string
  assistantName: string | null
}

async function call(path: string, body?: unknown, method?: string): Promise<Response> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const fresh = res.headers.get('set-auth-token')
  if (fresh) localStorage.setItem(TOKEN_KEY, fresh)
  return res
}

async function errorOf(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? i18n.t('errors.httpStatus', { status: res.status })
}

/** returns null on success, an error message otherwise */
export async function signUp(name: string, email: string, password: string): Promise<string | null> {
  try {
    const res = await call('/api/auth/sign-up/email', { name, email, password })
    return res.ok ? null : await errorOf(res)
  } catch {
    return i18n.t('errors.network')
  }
}

/** returns null on success, an error message otherwise */
export async function signIn(email: string, password: string): Promise<string | null> {
  try {
    const res = await call('/api/auth/sign-in/email', { email, password })
    return res.ok ? null : await errorOf(res)
  } catch {
    return i18n.t('errors.network')
  }
}

export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await call('/v1/me')
    if (!res.ok) return null
    const data = (await res.json()) as { user: SessionUser }
    return data.user
  } catch {
    return null
  }
}

/** persist profile fields onto the account — true on success. Setting the
 *  assistant name also marks onboarding as completed (see /v1/me PATCH). */
export async function updateMe(fields: { assistantName: string }): Promise<boolean> {
  try {
    const res = await call('/v1/me', fields, 'PATCH')
    return res.ok
  } catch {
    return false
  }
}

/** kick off the OAuth redirect — returns an error message, or navigates away */
export async function signInSocial(provider: 'google' | 'github'): Promise<string | null> {
  try {
    const res = await call('/api/auth/sign-in/social', {
      provider,
      callbackURL: `${window.location.origin}/login`,
    })
    if (!res.ok) return await errorOf(res)
    const data = (await res.json()) as { url?: string }
    if (!data.url) return i18n.t('errors.httpStatus', { status: res.status })
    window.location.href = data.url
    return null
  } catch {
    return i18n.t('errors.network')
  }
}

/**
 * After an OAuth redirect the session lives in a cookie only — exchange it
 * for the bearer token the app runs on. True when a token was adopted.
 */
export async function adoptSocialSession(): Promise<boolean> {
  if (getToken()) return false
  try {
    const res = await call('/v1/session-token')
    if (!res.ok) return false
    const data = (await res.json()) as { token?: string }
    if (!data.token) return false
    localStorage.setItem(TOKEN_KEY, data.token)
    return true
  } catch {
    return false
  }
}

export async function signOut(): Promise<void> {
  // revoke FIRST (bearer + cookie still attached) — clearing the token before
  // the call would leave the server session alive, and a live cookie session
  // gets re-adopted by the /login bootstrap, making logout impossible
  try {
    await call('/api/auth/sign-out', {})
  } catch {
    /* local sign-out is enough offline */
  }
  localStorage.removeItem(TOKEN_KEY)
}
