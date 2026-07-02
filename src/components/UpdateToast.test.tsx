import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('UpdateToast — new deploy notice', () => {
  it('appears when a newer build is detected and can be dismissed', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ updateReady: true }))
    expect(await screen.findByRole('status')).toHaveTextContent('Có phiên bản mới của Nova.')
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Để sau' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('stays hidden while the running build is current', async () => {
    await renderApp()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
