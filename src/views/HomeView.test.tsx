import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('<HomeView>', () => {
  it('clicking an intent suggestion navigates into a conversation', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, (s) => s.v.goHome())
    await user.click(await screen.findByText('Lên kế hoạch'))
    // suggestion routes into the conversation composer
    expect(await screen.findByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
  })

  it('greets by time of day (morning)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 8, 0, 0))
    renderWithStore(<App />, (s) => s.v.goHome())
    expect(await screen.findByText(/Chào buổi sáng/)).toBeInTheDocument()
  })

  it('greets by time of day (evening)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 20, 0, 0))
    renderWithStore(<App />, (s) => s.v.goHome())
    expect(await screen.findByText(/Chào buổi tối/)).toBeInTheDocument()
  })

  it('greets by time of day (noon)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0))
    renderWithStore(<App />, (s) => s.v.goHome())
    expect(await screen.findByText(/Chào buổi trưa/)).toBeInTheDocument()
  })

  it('greets by time of day (afternoon)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 15, 0, 0))
    renderWithStore(<App />, (s) => s.v.goHome())
    expect(await screen.findByText(/Chào buổi chiều/)).toBeInTheDocument()
  })
})
