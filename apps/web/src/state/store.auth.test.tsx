import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'
import {
  deleteAccount,
  fetchMe,
  signIn,
  signInSocial,
  signInSocialPopup,
  signOut,
  signUp,
  updateMe,
} from '../services/auth'

vi.mock('../services/auth', () => ({
  // like the real service, a successful sign-in/up stores the bearer token
  signIn: vi.fn(async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    return null
  }),
  signUp: vi.fn(async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    return null
  }),
  signInSocial: vi.fn(async () => null),
  // like the real popup: landing on /oauth-done stores the bearer token
  signInSocialPopup: vi.fn(async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    return 'ok'
  }),
  adoptSocialSession: vi.fn(async () => false),
  fetchMe: vi.fn(async () => ({
    id: 'u1',
    name: 'Thành Thật',
    email: 'test@kinal.co',
    assistantName: 'Trợ lý',
  })),
  signOut: vi.fn(async () => {}),
  updateMe: vi.fn(async () => true),
  changePassword: vi.fn(async () => null),
  deleteAccount: vi.fn(async () => true),
  getToken: () => localStorage.getItem('nova.auth.token'),
}))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(signIn).mockClear()
  vi.mocked(signUp).mockClear()
  vi.mocked(signOut).mockClear()
  vi.mocked(updateMe).mockClear()
})
afterEach(() => vi.useRealTimers())

describe('store — real auth wiring (BE1)', () => {
  it('login submits credentials, adopts the server profile and navigates home', async () => {
    const { result, router } = await renderStore({ path: '/login' })
    let err: string | null = 'pending'
    await act(async () => {
      err = await result.current.v.submitAuth('test@kinal.co', 'password1')
    })
    expect(err).toBeNull()
    expect(signIn).toHaveBeenCalledWith('test@kinal.co', 'password1')
    expect(result.current.s.userName).toBe('Thành Thật')
    expect(result.current.s.assistantName).toBe('Trợ lý')
    expect(router.state.location.pathname).not.toBe('/login')
  })

  it('completeOnboarding writes the name to the account — the durable marker social logins check', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.v.completeOnboarding({
        assistantName: '  Bee  ',
        styles: { concise: true, warm: true, formal: false, humor: false },
        slot: 'fast',
      }),
    )
    expect(updateMe).toHaveBeenCalledWith({ assistantName: 'Bee' })
  })

  it('renaming the assistant in Settings PATCHes the server once, debounced', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    vi.useFakeTimers()
    act(() => result.current.v.setAssistantName('B'))
    act(() => result.current.v.setAssistantName('Be'))
    act(() => result.current.v.setAssistantName('Bee'))
    await act(async () => {
      vi.advanceTimersByTime(800)
    })
    expect(updateMe).toHaveBeenCalledTimes(1)
    expect(updateMe).toHaveBeenCalledWith({ assistantName: 'Bee' })
  })

  it('popup OAuth: ok adopts in place; a first-ever account routes to onboarding', async () => {
    vi.mocked(fetchMe).mockResolvedValueOnce({
      id: 'u-social',
      name: 'Google User',
      email: 'social@kinal.co',
      assistantName: null,
    })
    const { result, router } = await renderStore({ path: '/login' })
    let err: string | null = 'pending'
    await act(async () => {
      err = await result.current.v.socialLogin('google')
    })
    expect(err).toBeNull()
    expect(result.current.s.userEmail).toBe('social@kinal.co')
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('popup OAuth: a blocker falls back to the classic redirect; abandoning is silent', async () => {
    vi.mocked(signInSocialPopup).mockResolvedValueOnce('blocked')
    const { result, router } = await renderStore({ path: '/login' })
    await act(async () => {
      await result.current.v.socialLogin('github')
    })
    expect(signInSocial).toHaveBeenCalledWith('github')

    vi.mocked(signInSocialPopup).mockResolvedValueOnce('closed')
    let err: string | null = 'pending'
    await act(async () => {
      err = await result.current.v.socialLogin('google')
    })
    expect(err).toBeNull()
    expect(router.state.location.pathname).toBe('/login')

    // a concrete error message from the popup flow reaches the form
    vi.mocked(signInSocialPopup).mockResolvedValueOnce('Provider not found')
    await act(async () => {
      err = await result.current.v.socialLogin('google')
    })
    expect(err).toBe('Provider not found')
  })

  it('D4 — deleting the account wipes local state and lands on /login', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    localStorage.setItem('nova.flow.settings.v5', '{"userName":"X"}')
    const { result, router } = await renderStore({ path: '/onboarding' })
    let ok = false
    await act(async () => {
      ok = await result.current.v.deleteAccount()
    })
    expect(ok).toBe(true)
    expect(deleteAccount).toHaveBeenCalled()
    expect(localStorage.getItem('nova.auth.token')).toBeNull()
    expect(localStorage.getItem('nova.flow.settings.v5')).toBeNull()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('signup derives the name from the email and lands on onboarding', async () => {
    const { result } = await renderStore({ path: '/signup' })
    await act(async () => {
      await result.current.v.submitAuth('lan.phuong@kinal.co', 'password1')
    })
    expect(signUp).toHaveBeenCalledWith('lan.phuong', 'lan.phuong@kinal.co', 'password1')
    expect(result.current.v.isOnboarding).toBe(true)
  })

  it('a profile without an assistant name keeps the local default', async () => {
    vi.mocked(fetchMe).mockResolvedValueOnce({
      id: 'u2',
      name: 'Lan',
      email: 'lan@kinal.co',
      assistantName: null,
    })
    const { result } = await renderStore({ path: '/login' })
    await act(async () => {
      await result.current.v.submitAuth('lan@kinal.co', 'password1')
    })
    expect(result.current.s.userName).toBe('Lan')
    expect(result.current.s.assistantName).toBe('Nova')
  })

  it('login still navigates when the session probe returns nothing', async () => {
    vi.mocked(fetchMe).mockResolvedValueOnce(null)
    const { result, router } = await renderStore({ path: '/login' })
    const before = result.current.s.userName
    await act(async () => {
      await result.current.v.submitAuth('test@kinal.co', 'password1')
    })
    expect(result.current.s.userName).toBe(before)
    expect(router.state.location.pathname).not.toBe('/login')
  })

  it('a server error surfaces to the form and blocks navigation', async () => {
    vi.mocked(signIn).mockResolvedValueOnce('Sai mật khẩu')
    const { result, router } = await renderStore({ path: '/login' })
    let err: string | null = null
    await act(async () => {
      err = await result.current.v.submitAuth('test@kinal.co', 'sai-roi-123')
    })
    expect(err).toBe('Sai mật khẩu')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('logout signs out server-side too', async () => {
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.logout())
    expect(signOut).toHaveBeenCalled()
    expect(fetchMe).toBeDefined()
  })

  it('a social login (token, nothing persisted) adopts the account at boot', async () => {
    // the OAuth callback flow stores ONLY the bearer token then reloads —
    // boot must resolve the session user itself
    localStorage.setItem('nova.auth.token', 'tok-social')
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() => expect(result.current.s.userName).toBe('Thành Thật'))
    expect(result.current.s.userEmail).toBe('test@kinal.co')
    expect(result.current.s.accountId).toBe('u1')
    expect(result.current.s.assistantName).toBe('Trợ lý')
  })
})
