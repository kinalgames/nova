import { beforeEach, describe, expect, it } from 'vitest'
import { makeUser, renderApp } from './test/util'
import { screen, within } from '@testing-library/react'

beforeEach(() => localStorage.clear())

describe('App — shell & navigation', () => {
  it('renders the conversation shell with a composer by default', async () => {
    await renderApp()
    expect(screen.getByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi' })).toBeInTheDocument()
  })

  it('navigates to Settings via the account menu', async () => {
    const user = makeUser()
    await renderApp()
    await user.click(screen.getByRole('button', { name: /Tài khoản/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Cài đặt' }))
    expect(await screen.findByText('Chế độ nâng cao')).toBeInTheDocument()
  })

  it('reaches the assistant config via the settings dialog Trợ lý tab', async () => {
    const user = makeUser()
    await renderApp()
    await user.click(screen.getByRole('button', { name: /Tài khoản/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Cài đặt' }))
    await user.click(await screen.findByRole('tab', { name: 'Trợ lý' }))
    expect(await screen.findByText('PHONG CÁCH TRẢ LỜI')).toBeInTheDocument()
  })

  it('opens the command palette (Radix dialog) from the sidebar search', async () => {
    const user = makeUser()
    await renderApp()
    await user.click(screen.getByRole('button', { name: /Tìm/ }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByPlaceholderText('Tìm trang, dự án, hành động…'),
    ).toBeInTheDocument()
  })
})

describe('App — root redirect', () => {
  it('redirects the root to a conversation', async () => {
    await renderApp(undefined, { path: '/' })
    expect(
      await screen.findByRole('textbox', { name: 'Nhắn cho Nova' }),
    ).toBeInTheDocument()
  })

  it('redirects the root to the persisted last conversation', async () => {
    localStorage.setItem(
      'nova.flow.settings.v3',
      JSON.stringify({
        activeConv: 'c3',
        conversations: [
          { id: 'c1', title: 'a', projectId: 'aurora' },
          { id: 'c3', title: 'b', projectId: 'aurora' },
        ],
        threads: { c3: [] },
      }),
    )
    const { store } = await renderApp(undefined, { path: '/' })
    expect(store().v.headerTitle).toBe('b')
  })
})

describe('App — sending a message', () => {
  it('appends the typed message to the conversation', async () => {
    const user = makeUser()
    await renderApp()
    const input = screen.getByRole('textbox', { name: 'Nhắn cho Nova' })
    await user.type(input, 'Phân tích quý 4 giúp mình')
    await user.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(await screen.findByText('Phân tích quý 4 giúp mình')).toBeInTheDocument()
    // the field clears after sending
    expect(input).toHaveValue('')
  })
})
