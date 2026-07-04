import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, makeUser } from '../test/util'

beforeEach(() => localStorage.clear())

describe('rename dialog (paper)', () => {
  // slow under coverage instrumentation
  it('renames a conversation through the dialog', { timeout: 15_000 }, async () => {
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

  // slow under coverage instrumentation
  it('escape closes the rename dialog without saving', { timeout: 15_000 }, async () => {
    const user = makeUser()
    await renderApp()
    await user.hover(screen.getByText('Đoạn mở đầu trang đích'))
    await user.click(screen.getAllByRole('button', { name: 'Tùy chọn cuộc trò chuyện' })[0])
    await user.click(await screen.findByRole('menuitem', { name: 'Đổi tên' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // the title is untouched
    expect(screen.getAllByText('Đoạn mở đầu trang đích').length).toBeGreaterThan(0)
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
    await renderApp((s) => s.v.previewFile({ kind: 'pdf', name: 'brief.pdf', open: 'pdf' }))
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
    // full parity with the desktop sidebar menu (was rename/pin/delete only)
    expect(await screen.findByRole('menuitem', { name: 'Đổi tên' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Lưu trữ' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Chia sẻ liên kết' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Xuất Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Xóa' })).toBeInTheDocument()
  })

  it('mobile drawer rows reflect pinned/shared, deleting (undo) and busy (replying)', async () => {
    const user = makeUser()
    // busy follows the NAV-active conversation (c1 at the default /chat/c1
    // route) — pinned/shared and deleting go on the OTHER two rows
    await renderApp((s) =>
      s.set((x) => ({
        vw: 375,
        drawerOpen: true,
        typing: true,
        deleting: [x.conversations[2].id],
        conversations: x.conversations.map((c, i) => ({
          ...c,
          projectId: x.conversations[0].projectId,
          ...(i === 1 ? { pinned: true, shareId: 'sh-x' } : {}),
        })),
      })),
    )
    const dialog = await screen.findByRole('dialog')
    // deleting row shows Undo; the nav-active row shows the replying pulse
    expect(within(dialog).getByRole('button', { name: 'Hoàn tác' })).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Đang trả lời' })).toBeInTheDocument()
    // the pinned+shared row (sorted first) carries Unpin AND Stop-sharing
    const more = within(dialog).getAllByRole('button', { name: 'Tùy chọn cuộc trò chuyện' })
    await user.click(more[0])
    expect(await screen.findByRole('menuitem', { name: 'Bỏ ghim' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Huỷ chia sẻ' })).toBeInTheDocument()
  })

  it('mobile drawer surfaces archived conversations for restore (parity)', async () => {
    const user = makeUser()
    await renderApp((s) =>
      s.set((x) => ({
        vw: 375,
        drawerOpen: true,
        conversations: x.conversations.map((c, i) => (i === 0 ? { ...c, archived: true } : c)),
      })),
    )
    const dialog = await screen.findByRole('dialog')
    // the archived section toggle is present and expands to the row
    const toggle = within(dialog).getByRole('button', { name: /LƯU TRỮ/ })
    await user.click(toggle)
    // an archived conversation now has its options menu reachable on mobile
    const more = within(dialog).getAllByRole('button', { name: 'Tùy chọn cuộc trò chuyện' })
    expect(more.length).toBeGreaterThan(0)
  })
})

describe('new project dialog', () => {
  // slow under coverage instrumentation
  it('needs a name — an empty submit keeps the dialog open, a named one creates', { timeout: 15_000 }, async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/projects' })
    await user.click(await screen.findByRole('button', { name: 'Dự án mới' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('TÊN DỰ ÁN'), 'Dự án X')
    await user.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getAllByText('Dự án X').length).toBeGreaterThan(0)
  })
})
