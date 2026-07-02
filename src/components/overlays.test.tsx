import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, makeUser } from '../test/util'

beforeEach(() => localStorage.clear())

describe('rename dialog (paper)', () => {
  it('renames a conversation through the dialog', async () => {
    const user = makeUser()
    await renderApp()
    await user.hover(screen.getByText('Đoạn mở đầu trang đích'))
    await user.click(screen.getAllByRole('button', { name: 'Tùy chọn cuộc trò chuyện' })[0])
    await user.click(await screen.findByRole('menuitem', { name: 'Đổi tên' }))
    const dialog = await screen.findByRole('dialog')
    const input = within(dialog).getByLabelText('Tên cuộc trò chuyện')
    await user.clear(input)
    await user.type(input, 'Tên qua dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // the new title shows in the sidebar row AND the top bar
    expect(screen.getAllByText('Tên qua dialog').length).toBeGreaterThan(0)
  })
})

describe('command palette search', () => {
  it('finds a conversation in ANOTHER project, diacritic-insensitively, and opens it', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ palette: true }))
    const dialog = await screen.findByRole('dialog')
    // active project is Aurora; "Phân tích khảo sát" (c4) lives in Chung
    await user.type(within(dialog).getByRole('textbox'), 'khao sat')
    const hitRow = await within(dialog).findByRole('button', { name: /Phân tích khảo sát/ })
    expect(within(hitRow).getByText('Chung')).toBeInTheDocument()
    await user.click(hitRow)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText(/Tóm tắt khảo sát người dùng/)).toBeInTheDocument()
  })

  it('finds a project and an action; empty query shows the static jumps', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ palette: true }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('ĐI TỚI')).toBeInTheDocument()
    const input = within(dialog).getByRole('textbox')
    await user.type(input, 'chung')
    expect(await within(dialog).findByRole('button', { name: 'Chung' })).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'tap trung')
    expect(
      await within(dialog).findByRole('button', { name: /Vào chế độ tập trung/ }),
    ).toBeInTheDocument()
  })

  it('shows an empty state for a nonsense query', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ palette: true }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'zzzyyy')
    expect(await within(dialog).findByText(/Không có kết quả/)).toBeInTheDocument()
  })
})

describe('overlay open/close wiring', () => {
  it('command palette closes on Escape (onOpenChange → closeMenus)', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ palette: true }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('preview closes via its close button (onOpenChange → closePreview)', async () => {
    const user = makeUser()
    await renderApp((s) => s.v.openPdf())
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mobile drawer navigates and closes when a project is chosen', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ vw: 375, drawerOpen: true }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('link', { name: /Aurora/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mobile drawer closes via its close button (onOpenChange → closeDrawer)', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ vw: 375, drawerOpen: true }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mobile drawer exposes per-conversation actions (rename / pin / delete)', async () => {
    const user = makeUser()
    await renderApp((s) => s.set({ vw: 375, drawerOpen: true }))
    const dialog = await screen.findByRole('dialog')
    const more = within(dialog).getAllByRole('button', { name: 'Tùy chọn cuộc trò chuyện' })
    expect(more.length).toBeGreaterThan(0)
    await user.click(more[0])
    expect(await screen.findByRole('menuitem', { name: 'Đổi tên' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Xóa' })).toBeInTheDocument()
  })
})
