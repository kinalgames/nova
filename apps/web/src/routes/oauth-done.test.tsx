import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '../test/util'
import { adoptSocialSession } from '../services/auth'

vi.mock('../services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/auth')>()),
  adoptSocialSession: vi.fn(async () => true),
}))

afterEach(() => vi.unstubAllGlobals())

describe('/oauth-done — popup landing', () => {
  it('adopts the session and closes itself when opened as a popup', async () => {
    const close = vi.fn()
    vi.stubGlobal('opener', {})
    vi.stubGlobal('close', close)
    await renderApp(undefined, { path: '/oauth-done' })
    expect(screen.getByText('Đang hoàn tất đăng nhập…')).toBeInTheDocument()
    await waitFor(() => expect(adoptSocialSession).toHaveBeenCalled())
    await waitFor(() => expect(close).toHaveBeenCalled())
  })

  it('a direct visit (no opener) continues into the app instead', async () => {
    vi.stubGlobal('opener', null)
    const rep = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
    await renderApp(undefined, { path: '/oauth-done' })
    await waitFor(() => expect(rep).toHaveBeenCalledWith('/'))
    rep.mockRestore()
  })
})
