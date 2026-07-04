import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('SettingsDialog — rail search + fixed layout', () => {
  it('filters the tab list by label and shows an empty state', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1?settings=general' })
    const dialog = await screen.findByRole('dialog')
    const search = within(dialog).getByPlaceholderText(/Tìm cài đặt/)
    await user.type(search, 'trợ')
    // only the Assistant tab survives the filter
    const tabs = within(dialog).getAllByRole('tab')
    expect(tabs).toHaveLength(1)
    expect(tabs[0]).toHaveTextContent('Trợ lý')
    await user.clear(search)
    await user.type(search, 'zzzz')
    expect(within(dialog).getByText(/Không có mục phù hợp/)).toBeInTheDocument()
  })
})

describe('SettingsDialog — Account tab email status', () => {
  it('shows a verified badge when the email is confirmed', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    await renderApp(undefined, {
      path: '/new?settings=account',
      world: 'real',
      storeInit: { accountId: 'a1', userEmail: 'v@kinal.co', emailVerified: true },
    })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Đã xác nhận/)).toBeInTheDocument()
  })

  it('offers a resend when the email is unverified', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    await renderApp(undefined, {
      path: '/new?settings=account',
      world: 'real',
      storeInit: { accountId: 'a1', userEmail: 'x@kinal.co', emailVerified: false },
    })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Chưa xác nhận/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Gửi lại email/ })).toBeInTheDocument()
  })

  it('hides password + delete + resend when the account is not deletable', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    // no userEmail => accountDeletable false => PasswordSection and DangerZone
    // render null, and the resend affordance is withheld
    await renderApp(undefined, {
      path: '/new?settings=account',
      world: 'real',
      storeInit: { accountId: 'a1', userEmail: '', emailVerified: false },
    })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'Xoá tài khoản…' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Đổi mật khẩu…' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Gửi lại email/ })).not.toBeInTheDocument()
  })
})

describe('SettingsDialog — mobile rail', () => {
  const w = window.innerWidth
  afterEach(() => {
    window.innerWidth = w
    window.dispatchEvent(new Event('resize'))
  })

  it('mobile keeps the close button in the fixed top bar', async () => {
    window.innerWidth = 380
    window.dispatchEvent(new Event('resize'))
    await renderApp(undefined, { path: '/chat/c1?settings=general' })
    const dialog = await screen.findByRole('dialog')
    // close lives in the mobile top rail (tablist row), not the panel header
    expect(within(dialog).getByRole('button', { name: 'Đóng' })).toBeInTheDocument()
    expect(within(dialog).getAllByRole('tab').length).toBeGreaterThan(1)
  })
})
