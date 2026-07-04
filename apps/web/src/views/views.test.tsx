import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('views render on navigation', () => {
  it('Home shows the greeting and intent suggestions', async () => {
    await renderApp(undefined, { path: '/new' })
    expect(await screen.findByText(/Mình là Nova/)).toBeInTheDocument()
    expect(screen.getByText('Lên kế hoạch')).toBeInTheDocument()
  })

  it('Projects lists the default + sample projects', async () => {
    await renderApp((s) => s.v.goProjects())
    expect(await screen.findByText(/Mỗi dự án có hướng dẫn/)).toBeInTheDocument()
  })

  it('Project config shows instructions and files', async () => {
    await renderApp(undefined, { path: '/projects/aurora/config' })
    expect(await screen.findByText('GIỚI THIỆU DỰ ÁN')).toBeInTheDocument()
    expect(screen.getByText('TỆP DỰ ÁN')).toBeInTheDocument()
  })

  it('Project view lists that project\u2019s conversations', async () => {
    await renderApp(undefined, { path: '/projects/aurora' })
    // the Aurora conversation appears (also in the sidebar, hence findAll)
    expect((await screen.findAllByText('Đoạn mở đầu trang đích')).length).toBeGreaterThan(0)
    expect(screen.getByText('3 CUỘC TRÒ CHUYỆN')).toBeInTheDocument()
  })

  it('creates a project from the new-project dialog and lands on it', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/projects' })
    await user.click(screen.getByRole('button', { name: 'Dự án mới' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('TÊN DỰ ÁN'), 'Phong Thần')
    await user.click(within(dialog).getByRole('button', { name: 'Tạo dự án' }))
    expect(
      await screen.findByText('Chưa có cuộc trò chuyện nào trong dự án này.'),
    ).toBeInTheDocument()
  })

  it('Project view: default project + starting a new chat in it', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/projects/chung' })
    expect(await screen.findByText('Mặc định')).toBeInTheDocument()
    expect((await screen.findAllByText('Phân tích khảo sát')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Trò chuyện mới/ }))
    expect(await screen.findByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
  })

  it('Project config: edits the name, then deletes via the confirm dialog', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/projects/aurora/config' })
    const name = await screen.findByLabelText('Tên dự án')
    await user.clear(name)
    await user.type(name, 'Aurora X')
    expect(name).toHaveValue('Aurora X')
    await user.click(screen.getByRole('button', { name: /Xóa dự án/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/chuyển về dự án Chung/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Xóa' }))
    expect(await screen.findByText(/Mỗi dự án có hướng dẫn/)).toBeInTheDocument()
  })

  it('Project config: canceling the confirm keeps the project', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/projects/aurora/config' })
    await user.click(await screen.findByRole('button', { name: /Xóa dự án/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(store().s.projects.find((p) => p.id === 'aurora')).toBeDefined()
  })

  it('Project config: the default project is read-only with no delete', async () => {
    await renderApp(undefined, { path: '/projects/chung/config' })
    expect(await screen.findByText(/không đổi tên hay xóa/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xóa dự án/ })).not.toBeInTheDocument()
  })

  it('Nova shows the assistant config', async () => {
    await renderApp((s) => s.v.goAssistant())
    expect(await screen.findByText('HƯỚNG DẪN HỆ THỐNG')).toBeInTheDocument()
  })

  it('Nova shows each skill preset with its tool tags (no advanced needed)', async () => {
    await renderApp(undefined, { path: '/chat/c1?settings=assistant', storeInit: { advanced: false } })
    expect(await screen.findByText('KỸ NĂNG CỦA NOVA')).toBeInTheDocument()
    // tool chips are promoted: visible for everyone, not gated behind advanced
    expect(screen.getAllByText('Đọc web').length).toBeGreaterThan(0)
  })

  it('Settings shows providers and the advanced card', async () => {
    await renderApp((s) => s.v.goSettings())
    expect(await screen.findByText('Chế độ nâng cao')).toBeInTheDocument()
    expect(screen.getByText('Thanh phím tắt dưới cùng')).toBeInTheDocument()
  })

  it('Settings shows the shortcuts-bar toggle without advanced', async () => {
    await renderApp(undefined, { path: '/chat/c1?settings=general', storeInit: { advanced: false } })
    expect(await screen.findByText('Thanh phím tắt dưới cùng')).toBeInTheDocument()
  })
})

describe('project interactions', () => {
  it('the top-bar title opens the active project view', async () => {
    const user = makeUser()
    await renderApp()
    await user.click(screen.getByRole('button', { name: /Đối chiếu benchmark/ }))
    expect(await screen.findByText('3 CUỘC TRÒ CHUYỆN')).toBeInTheDocument()
  })

  it('the new-project dialog cancels without creating', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/projects' })
    const before = store().s.projects.length
    await user.click(screen.getByRole('button', { name: 'Dự án mới' }))
    await user.click(await screen.findByRole('button', { name: 'Hủy' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(store().s.projects.length).toBe(before)
  })

  it('Project config edits the description live', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/projects/aurora/config' })
    const desc = await screen.findByLabelText('Giới thiệu dự án')
    await user.clear(desc)
    await user.type(desc, 'Bối cảnh mới')
    expect(store().s.projects.find((p) => p.id === 'aurora')?.description).toBe('Bối cảnh mới')
  })

  it('Project config opens a project file preview', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/projects/aurora/config' })
    await user.click(await screen.findByText('plan.md'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('settings — language picker', () => {
  it('switches the UI to English and back to Vietnamese', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1?settings=general' })
    expect(await screen.findByText('GIAO DIỆN')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'English' }))
    // chrome flips to English
    expect(await screen.findByText('APPEARANCE')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Assistant' })).toBeInTheDocument()
    // and back — restores the pinned test locale for the rest of the suite
    await user.click(screen.getByRole('button', { name: 'Tiếng Việt' }))
    expect(await screen.findByText('GIAO DIỆN')).toBeInTheDocument()
  })
})

describe('sidebar states', () => {
  it('renders the collapsed rail (icon-only) and can be expanded', async () => {
    await renderApp((s) => s.set({ sidebarCollapsed: true }))
    expect(await screen.findByRole('button', { name: 'Mở thanh bên' })).toBeInTheDocument()
  })
})

describe('overlays render on demand', () => {
  it('quiet (focus) mode takes over the screen', async () => {
    await renderApp((s) => s.v.enterQuiet())
    expect(await screen.findByText(/TẬP TRUNG/)).toBeInTheDocument()
  })
})

describe('project config — accent + file picker (UI handlers)', () => {
  it('picks a project accent from the swatch row', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/projects/aurora/config' })
    const swatches = await screen.findAllByRole('button', { name: /Chọn màu/ })
    const target = swatches.find((b) => b.getAttribute('aria-pressed') === 'false')!
    const color = target.getAttribute('aria-label')!.replace('Chọn màu ', '')
    await user.click(target)
    expect(target).toHaveAttribute('aria-pressed', 'true')
    expect(store().s.projects.find((p) => p.id === 'aurora')?.accent).toBe(color)
  })

  it('uploads a project file through the picker button and hidden input', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/projects/aurora/config' })
    // the visible button proxies the hidden file input
    await user.click(await screen.findByRole('button', { name: 'Tải tệp lên' }))
    const input = screen.getByLabelText('Tải tệp vào dự án')
    fireEvent.change(input, {
      target: { files: [new File(['# notes'], 'ghi-chú.md', { type: 'text/markdown' })] },
    })
    expect(await screen.findByText('ghi-chú.md')).toBeInTheDocument()
    expect(
      store().s.projects.find((p) => p.id === 'aurora')?.files?.some((f) => f.name === 'ghi-chú.md'),
    ).toBe(true)
  })
})
