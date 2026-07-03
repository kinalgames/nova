import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'
import { fetchMe, signIn, signOut, signUp } from '../services/auth'

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
  adoptSocialSession: vi.fn(async () => false),
  fetchMe: vi.fn(async () => ({
    id: 'u1',
    name: 'Thành Thật',
    email: 'test@kinal.co',
    assistantName: 'Trợ lý',
  })),
  signOut: vi.fn(async () => {}),
  getToken: () => localStorage.getItem('nova.auth.token'),
}))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(signIn).mockClear()
  vi.mocked(signUp).mockClear()
  vi.mocked(signOut).mockClear()
})

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
