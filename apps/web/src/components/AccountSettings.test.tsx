import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { updateMe } from '../services/auth'

// the onboarding submit persists the name server-side — stub ONLY that call
vi.mock('../services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/auth')>()),
  updateMe: vi.fn(async () => true),
}))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(updateMe).mockClear()
})

describe('Settings — profile & data controls (Track D)', () => {
  // generous timeout: per-keystroke typing through the full app re-render is
  // slow under coverage instrumentation
  it('edits the user and assistant names from Settings → Chung', { timeout: 15_000 }, async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/chat/c1?settings=general' })
    const dialog = await screen.findByRole('dialog')

    const nameBox = within(dialog).getByLabelText('TÊN CỦA BẠN')
    await user.clear(nameBox)
    await user.type(nameBox, 'Lan Phương')
    expect(store().s.userName).toBe('Lan Phương')

    const asBox = within(dialog).getByLabelText('TÊN TRỢ LÝ')
    await user.clear(asBox)
    await user.type(asBox, 'Bee')
    expect(store().s.assistantName).toBe('Bee')
  })

  it('the system prompt is editable from Settings → Trợ lý and lands in the store', { timeout: 15_000 }, async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/chat/c1?settings=assistant' })
    const dialog = await screen.findByRole('dialog')
    const box = within(dialog).getByLabelText('HƯỚNG DẪN HỆ THỐNG')
    await user.type(box, 'Luôn xưng em.')
    expect(store().s.systemPrompt).toBe('Luôn xưng em.')
  })

  it('export downloads a json; clear asks for confirmation first', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1?settings=general' })
    const dialog = await screen.findByRole('dialog')

    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await user.click(within(dialog).getByRole('button', { name: 'Tải xuống' }))
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()

    await user.click(within(dialog).getByRole('button', { name: 'Xóa…' }))
    expect(within(dialog).getByRole('button', { name: 'Xóa vĩnh viễn' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(
      within(dialog).queryByRole('button', { name: 'Xóa vĩnh viễn' }),
    ).not.toBeInTheDocument()
  })
})

describe('Cheatsheet — shortcuts dialog', () => {
  it('opens from the shortcuts bar, lists real shortcuts, closes on Escape', async () => {
    const user = makeUser()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Xem bảng phím tắt' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Phím tắt')).toBeInTheDocument()
    expect(within(dialog).getByText('Mở bảng lệnh')).toBeInTheDocument()
    expect(within(dialog).getByText('Chế độ tập trung')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Mở bảng lệnh')).not.toBeInTheDocument()
  })
})

describe('Onboarding — choices persist for real', () => {
  it('style chips, slot card and assistant name land in the store', async () => {
    const user = makeUser()
    localStorage.setItem('nova.auth.token', 'tok') // onboarding follows a fresh signup
    const { store } = await renderApp(undefined, { path: '/onboarding' })

    const nameBox = await screen.findByLabelText('TÊN TRỢ LÝ')
    await user.clear(nameBox)
    await user.type(nameBox, 'Bee')
    await user.click(screen.getByRole('button', { name: 'Ấm áp' }))
    await user.click(screen.getByRole('button', { name: /Nhanh/ }))
    await user.click(screen.getByRole('button', { name: 'Bắt đầu dùng Nova' }))

    expect(store().s.assistantName).toBe('Bee')
    expect(store().s.styles.warm).toBe(true)
    expect(store().s.activeSlot).toBe('fast')
    // and the durable server-side marker was written
    expect(updateMe).toHaveBeenCalledWith({ assistantName: 'Bee' })
  })
})
