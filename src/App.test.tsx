import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { StoreProvider } from './state/store'

function renderApp() {
  return render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  )
}
beforeEach(() => localStorage.clear())

describe('App — shell & navigation', () => {
  it('renders the conversation shell with a composer by default', () => {
    renderApp()
    expect(screen.getByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi' })).toBeInTheDocument()
  })

  it('navigates to Settings via the sidebar', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Cài đặt' }))
    expect(await screen.findByText('Chế độ nâng cao')).toBeInTheDocument()
  })

  it('navigates to Nova via the sidebar', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Nova' }))
    expect(await screen.findByText('PHONG CÁCH TRẢ LỜI')).toBeInTheDocument()
  })

  it('opens the command palette (Radix dialog) from the sidebar search', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /Tìm/ }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByPlaceholderText('Tìm trang, dự án, hành động…'),
    ).toBeInTheDocument()
  })
})

describe('App — sending a message', () => {
  it('appends the typed message to the conversation', async () => {
    const user = userEvent.setup()
    renderApp()
    const input = screen.getByRole('textbox', { name: 'Nhắn cho Nova' })
    await user.type(input, 'Phân tích quý 4 giúp mình')
    await user.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(await screen.findByText('Phân tích quý 4 giúp mình')).toBeInTheDocument()
    // the field clears after sending
    expect(input).toHaveValue('')
  })
})
