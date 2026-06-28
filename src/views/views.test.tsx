import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())

describe('views render on navigation', () => {
  it('Home shows the greeting and intent suggestions', async () => {
    renderWithStore(<App />, (s) => s.v.goHome())
    expect(await screen.findByText(/Mình là Nova/)).toBeInTheDocument()
    expect(screen.getByText('Lên kế hoạch')).toBeInTheDocument()
  })

  it('Projects lists the default + sample projects', async () => {
    renderWithStore(<App />, (s) => s.v.goProjects())
    expect(await screen.findByText(/Mỗi dự án có hướng dẫn/)).toBeInTheDocument()
  })

  it('Project config shows instructions and files', async () => {
    renderWithStore(<App />, (s) => s.v.goProjectCfg())
    expect(await screen.findByText('GIỚI THIỆU DỰ ÁN')).toBeInTheDocument()
    expect(screen.getByText('TỆP DỰ ÁN')).toBeInTheDocument()
  })

  it('Nova shows the assistant config', async () => {
    renderWithStore(<App />, (s) => s.v.goAssistant())
    expect(await screen.findByText('HƯỚNG DẪN HỆ THỐNG')).toBeInTheDocument()
  })

  it('Nova shows each skill preset with its tool tags (no advanced needed)', async () => {
    renderWithStore(<App />, (s) => s.set({ settingsOpen: true, settingsTab: 'assistant', advanced: false }))
    expect(await screen.findByText('KỸ NĂNG CỦA NOVA')).toBeInTheDocument()
    // tool chips are promoted: visible for everyone, not gated behind advanced
    expect(screen.getAllByText('Đọc web').length).toBeGreaterThan(0)
  })

  it('Settings shows providers and the advanced card', async () => {
    renderWithStore(<App />, (s) => s.v.goSettings())
    expect(await screen.findByText('Chế độ nâng cao')).toBeInTheDocument()
    expect(screen.getByText('Thanh phím tắt dưới cùng')).toBeInTheDocument()
  })

  it('Settings in advanced mode reveals the custom-provider row', async () => {
    renderWithStore(<App />, (s) => s.set({ settingsOpen: true, settingsTab: 'providers', advanced: true }))
    expect(await screen.findByText(/Thêm nhà cung cấp tùy chỉnh/)).toBeInTheDocument()
  })

  it('Settings shows the shortcuts-bar toggle without advanced', async () => {
    renderWithStore(<App />, (s) => s.set({ settingsOpen: true, settingsTab: 'general', advanced: false }))
    expect(await screen.findByText('Thanh phím tắt dưới cùng')).toBeInTheDocument()
  })
})

describe('sidebar states', () => {
  it('renders the collapsed rail (icon-only) and can be expanded', async () => {
    renderWithStore(<App />, (s) => s.set({ sidebarCollapsed: true }))
    expect(await screen.findByRole('button', { name: 'Mở thanh bên' })).toBeInTheDocument()
  })
})

describe('overlays render on demand', () => {
  it('quiet (focus) mode takes over the screen', async () => {
    renderWithStore(<App />, (s) => s.v.enterQuiet())
    expect(await screen.findByText(/TẬP TRUNG/)).toBeInTheDocument()
  })
})
