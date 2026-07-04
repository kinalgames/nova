import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, makeUser } from '../test/util'

beforeEach(() => localStorage.clear())

describe('VerifyBanner (D5)', () => {
  const unverified = {
    world: 'real' as const,
    path: '/new',
    storeInit: { accountId: 'a1', userEmail: 'x@kinal.co', emailVerified: false },
  }

  it('shows the verify nudge for a signed-in, unverified account', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    await renderApp(undefined, unverified)
    expect(await screen.findByText(/Xác nhận email để bảo vệ/)).toBeInTheDocument()
  })

  it('resend fires and surfaces a toast', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const user = makeUser()
    await renderApp(undefined, unverified)
    await user.click(await screen.findByRole('button', { name: /Gửi lại email/ }))
    // the store always toasts (success copy, or the network error offline)
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('stays hidden once the email is verified', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    await renderApp(undefined, {
      world: 'real',
      path: '/new',
      storeInit: { accountId: 'a1', userEmail: 'x@kinal.co', emailVerified: true },
    })
    await screen.findByLabelText(/Nội dung|content/i).catch(() => {})
    expect(screen.queryByText(/Xác nhận email để bảo vệ/)).not.toBeInTheDocument()
  })
})
