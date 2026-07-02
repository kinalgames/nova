import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp, makeUser } from '../test/util'

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('<HomeView>', () => {
  it('clicking an intent suggestion navigates into a conversation', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/new' })
    await user.click(await screen.findByText('Lên kế hoạch'))
    // suggestion routes into the conversation composer
    expect(await screen.findByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
  })

  it('disables the send button until the input has text', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/new' })
    const send = await screen.findByRole('button', { name: 'Gửi' })
    expect(send).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Nhắn cho Nova' }), 'chào')
    expect(send).toBeEnabled()
  })

  it('greets by time of day (morning)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 8, 0, 0))
    await renderApp(undefined, { path: '/new' })
    expect(await screen.findByText(/Chào buổi sáng/)).toBeInTheDocument()
  })

  it('greets by time of day (evening)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 20, 0, 0))
    await renderApp(undefined, { path: '/new' })
    expect(await screen.findByText(/Chào buổi tối/)).toBeInTheDocument()
  })

  it('greets by time of day (noon)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0))
    await renderApp(undefined, { path: '/new' })
    expect(await screen.findByText(/Chào buổi trưa/)).toBeInTheDocument()
  })

  it('greets by time of day (afternoon)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2025, 0, 1, 15, 0, 0))
    await renderApp(undefined, { path: '/new' })
    expect(await screen.findByText(/Chào buổi chiều/)).toBeInTheDocument()
  })
})
