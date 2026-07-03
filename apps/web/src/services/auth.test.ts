import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adoptSocialSession, fetchMe, getToken, signIn, signInSocial, signOut, signUp } from './auth'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

describe('auth service', () => {
  it('sign-in stores the bearer token from set-auth-token and returns null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ token: 't' }, 200, { 'set-auth-token': 'bearer-123' })),
    )
    expect(await signIn('a@b.vn', 'password1')).toBeNull()
    expect(getToken()).toBe('bearer-123')
  })

  it('sign-up surfaces the server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'User already exists' }, 422)),
    )
    expect(await signUp('A', 'a@b.vn', 'password1')).toBe('User already exists')
  })

  it('network failure returns a friendly message instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await signIn('a@b.vn', 'password1')).toBe('Không kết nối được máy chủ')
    expect(await signUp('A', 'a@b.vn', 'password1')).toBe('Không kết nối được máy chủ')
    expect(await fetchMe()).toBeNull()
    // sign-out still clears the local token when the server is unreachable
    localStorage.setItem('nova.auth.token', 't')
    await signOut()
    expect(getToken()).toBeNull()
  })

  it('an error body without a message falls back to the status code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 500)))
    expect(await signIn('a@b.vn', 'password1')).toBe('Lỗi 500')
  })

  it('fetchMe sends the stored bearer and returns the user', async () => {
    localStorage.setItem('nova.auth.token', 'bearer-xyz')
    const fetchMock = vi.fn(async () =>
      json({ user: { id: 'u1', name: 'Minh', email: 'a@b.vn', assistantName: null } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const me = await fetchMe()
    expect(me?.name).toBe('Minh')
    const headers = (fetchMock.mock.calls[0] as unknown[])[1] as { headers: Record<string, string> }
    expect(headers.headers.authorization).toBe('Bearer bearer-xyz')
  })

  it('an expired session yields null, and signOut clears the token', async () => {
    localStorage.setItem('nova.auth.token', 'stale')
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'unauthenticated' }, 401)))
    expect(await fetchMe()).toBeNull()
    await signOut()
    expect(getToken()).toBeNull()
  })
})

describe('social sign-in', () => {
  it('requests the OAuth URL with the provider and a same-origin callback', async () => {
    const fetchMock = vi.fn(async () => json({ url: 'https://accounts.google.com/o/oauth2/x' }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await signInSocial('google')).toBeNull()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/api/auth/sign-in/social')
    const body = JSON.parse(init.body as string) as { provider: string; callbackURL: string }
    expect(body.provider).toBe('google')
    expect(body.callbackURL).toContain('/login')
  })

  it('surfaces the server error when the provider is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Provider not found' }, 400)))
    expect(await signInSocial('github')).toBe('Provider not found')
  })

  it('adoptSocialSession exchanges the cookie session for a bearer token once', async () => {
    const fetchMock = vi.fn(async () => json({ token: 'sess-tok-1' }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await adoptSocialSession()).toBe(true)
    expect(getToken()).toBe('sess-tok-1')
    // a second call is a no-op — the token already exists
    expect(await adoptSocialSession()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('adoptSocialSession is false without a cookie session (401) or on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'unauthenticated' }, 401)))
    expect(await adoptSocialSession()).toBe(false)
    expect(getToken()).toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await adoptSocialSession()).toBe(false)
  })
})
