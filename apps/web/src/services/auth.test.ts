import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adoptSocialSession,
  changePassword,
  deleteAccount,
  fetchMe,
  getToken,
  signIn,
  signInSocial,
  signInSocialPopup,
  signOut,
  signUp,
  updateMe,
} from './auth'

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
    expect(await signIn('test@kinal.co', 'password1')).toBeNull()
    expect(getToken()).toBe('bearer-123')
  })

  it('sign-up surfaces the server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'User already exists' }, 422)),
    )
    expect(await signUp('A', 'test@kinal.co', 'password1')).toBe('User already exists')
  })

  it('network failure returns a friendly message instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await signIn('test@kinal.co', 'password1')).toBe('Không kết nối được máy chủ')
    expect(await signUp('A', 'test@kinal.co', 'password1')).toBe('Không kết nối được máy chủ')
    expect(await fetchMe()).toBeNull()
    // sign-out still clears the local token when the server is unreachable
    localStorage.setItem('nova.auth.token', 't')
    await signOut()
    expect(getToken()).toBeNull()
  })

  it('an error body without a message falls back to the status code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 500)))
    expect(await signIn('test@kinal.co', 'password1')).toBe('Lỗi 500')
  })

  it('fetchMe sends the stored bearer and returns the user', async () => {
    localStorage.setItem('nova.auth.token', 'bearer-xyz')
    const fetchMock = vi.fn(async () =>
      json({ user: { id: 'u1', name: 'Thành', email: 'test@kinal.co', assistantName: null } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const me = await fetchMe()
    expect(me?.name).toBe('Thành')
    const headers = (fetchMock.mock.calls[0] as unknown[])[1] as { headers: Record<string, string> }
    expect(headers.headers.authorization).toBe('Bearer bearer-xyz')
  })

  it('updateMe PATCHes the assistant name and reports success', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const fetchMock = vi.fn(async () => json({ user: { assistantName: 'Bee' } }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await updateMe({ assistantName: 'Bee' })).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/me')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ assistantName: 'Bee' })
  })

  it('D4 — changePassword posts the trio and revokes other sessions', async () => {
    const fetchMock = vi.fn(async () => json({ status: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await changePassword('old-pass', 'new-pass-123')).toBeNull()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/api/auth/change-password')
    expect(JSON.parse(init.body as string)).toEqual({
      currentPassword: 'old-pass',
      newPassword: 'new-pass-123',
      revokeOtherSessions: true,
    })
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Invalid password' }, 400)))
    expect(await changePassword('wrong', 'new-pass-123')).toBe('Invalid password')
  })

  it('D4 — deleteAccount DELETEs /v1/me and fails soft', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await deleteAccount()).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/me')
    expect(init.method).toBe('DELETE')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await deleteAccount()).toBe(false)
  })

  it('updateMe is false on a server error or network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'invalid_assistant_name' }, 400)))
    expect(await updateMe({ assistantName: '' })).toBe(false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await updateMe({ assistantName: 'Bee' })).toBe(false)
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
  it('signOut revokes with the bearer still attached, then clears the token', async () => {
    localStorage.setItem('nova.auth.token', 'live-tok')
    const fetchMock = vi.fn(async () => json({}))
    vi.stubGlobal('fetch', fetchMock)
    await signOut()
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as { headers: Record<string, string> }
    expect(init.headers.authorization).toBe('Bearer live-tok')
    expect(getToken()).toBeNull()
  })

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

  it('POPUP flow: ok when the popup closes with a token; closed when abandoned', async () => {
    vi.useFakeTimers()
    const popup = { closed: false, close: vi.fn(), location: { href: '' } }
    vi.stubGlobal('open', vi.fn(() => popup))
    vi.stubGlobal('fetch', vi.fn(async () => json({ url: 'https://accounts.google.com/x' })))
    const p = signInSocialPopup('google')
    await vi.advanceTimersByTimeAsync(0)
    expect(popup.location.href).toContain('accounts.google.com')
    localStorage.setItem('nova.auth.token', 'tok-pop')
    popup.closed = true
    await vi.advanceTimersByTimeAsync(500)
    expect(await p).toBe('ok')

    // abandoned: closes without a token
    localStorage.clear()
    const popup2 = { closed: false, close: vi.fn(), location: { href: '' } }
    vi.stubGlobal('open', vi.fn(() => popup2))
    const p2 = signInSocialPopup('github')
    await vi.advanceTimersByTimeAsync(0)
    popup2.closed = true
    await vi.advanceTimersByTimeAsync(500)
    expect(await p2).toBe('closed')
    vi.useRealTimers()
  })

  it('POPUP flow: a blocker yields "blocked"; a server error closes the popup', async () => {
    vi.stubGlobal('open', vi.fn(() => null))
    expect(await signInSocialPopup('google')).toBe('blocked')

    const popup = { closed: false, close: vi.fn(), location: { href: '' } }
    vi.stubGlobal('open', vi.fn(() => popup))
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Provider not found' }, 400)))
    expect(await signInSocialPopup('github')).toBe('Provider not found')
    expect(popup.close).toHaveBeenCalled()

    // a 200 without a url is a server bug — surfaced, popup closed
    const popup2 = { closed: false, close: vi.fn(), location: { href: '' } }
    vi.stubGlobal('open', vi.fn(() => popup2))
    vi.stubGlobal('fetch', vi.fn(async () => json({})))
    expect(typeof (await signInSocialPopup('google'))).toBe('string')
    expect(popup2.close).toHaveBeenCalled()
  })

  it('POPUP flow: a popup left open past 5 minutes times out as abandoned', async () => {
    vi.useFakeTimers()
    const popup = { closed: false, close: vi.fn(), location: { href: '' } }
    vi.stubGlobal('open', vi.fn(() => popup))
    vi.stubGlobal('fetch', vi.fn(async () => json({ url: 'https://gh.io/x' })))
    const p = signInSocialPopup('github')
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 500)
    expect(await p).toBe('closed')
    expect(popup.close).toHaveBeenCalled()
    vi.useRealTimers()
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
