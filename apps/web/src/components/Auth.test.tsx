import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

// unit tests never hit the real auth server — success by default; like the
// real service, a successful sign-in/up stores the bearer token
vi.mock('../services/auth', () => ({
  signIn: vi.fn(async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    return null
  }),
  signUp: vi.fn(async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    return null
  }),
  fetchMe: vi.fn(async () => null),
  signOut: vi.fn(async () => {}),
  getToken: () => localStorage.getItem('nova.auth.token'),
  signInSocial: vi.fn(async () => null),
  adoptSocialSession: vi.fn(async () => false),
}))

beforeEach(() => localStorage.clear())

describe('<Auth> — social sign-in', () => {
  // one provider per test — the first click sets a shared busy state that
  // disables both buttons, so clicking the second in the same render races
  // the mock's finally() re-enable
  it('the Google button kicks off the OAuth flow', async () => {
    const { signInSocial } = await import('../services/auth')
    const user = makeUser()
    await renderApp(undefined, { path: '/login' })
    await user.click(await screen.findByRole('button', { name: /google/i }))
    expect(signInSocial).toHaveBeenCalledWith('google')
  })

  it('the GitHub button kicks off the OAuth flow', async () => {
    const { signInSocial } = await import('../services/auth')
    const user = makeUser()
    await renderApp(undefined, { path: '/login' })
    await user.click(await screen.findByRole('button', { name: /github/i }))
    expect(signInSocial).toHaveBeenCalledWith('github')
  })
})

describe('<Auth> — email validation', () => {
  it('blocks an invalid email, then proceeds on a valid one', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/login' })
    const submit = await screen.findByRole('button', { name: 'Tiếp tục' })
    await user.click(submit)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Email/)
    await user.type(screen.getByLabelText('Email'), 'test@kinal.co')
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret123')
    await user.click(submit)
    await waitFor(() =>
      expect(screen.queryByText('Tiếp tục với Google')).not.toBeInTheDocument(),
    )
  })

  it('rejects a too-short password', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/login' })
    await user.type(screen.getByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Mật khẩu'), '123')
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Mật khẩu/)
  })
})

describe('<Auth>', () => {
  it('login form shows social + email options', async () => {
    await renderApp(undefined, { path: '/login' })
    expect(await screen.findByText('Tiếp tục với Google')).toBeInTheDocument()
    expect(screen.getByText('Tiếp tục với GitHub')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('signup form switches the title and CTA', async () => {
    await renderApp(undefined, { path: '/signup' })
    expect(await screen.findAllByText('Tạo tài khoản')).not.toHaveLength(0)
  })

  it('onboarding asks for assistant name + default model', async () => {
    localStorage.setItem('nova.auth.token', 'tok') // onboarding follows a fresh signup
    await renderApp(undefined, { path: '/onboarding' })
    expect(await screen.findByText('Chào mừng đến Nova')).toBeInTheDocument()
    expect(screen.getByText('TÊN TRỢ LÝ')).toBeInTheDocument()
  })
})

describe('mobile layout', () => {
  it('hides the sidebar and exposes the drawer menu button', async () => {
    await renderApp((s) => s.set({ vw: 375 }))
    expect(await screen.findByRole('button', { name: 'Mở menu' })).toBeInTheDocument()
  })

  it('opens the mobile drawer dialog', async () => {
    await renderApp((s) => s.set({ vw: 375, drawerOpen: true }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
