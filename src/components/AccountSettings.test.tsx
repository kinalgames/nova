import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('Settings — profile & data controls (Track D)', () => {
  it('edits the user and assistant names from Settings → Chung', async () => {
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
  })
})
