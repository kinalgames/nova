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

  it('Nova in advanced mode shows each skill preset with its tool tags', async () => {
    renderWithStore(<App />, (s) => s.set({ view: 'assistant', advanced: true }))
    expect(await screen.findByText('KỸ NĂNG CỦA NOVA')).toBeInTheDocument()
    // advanced reveals the per-skill tool chips (PresetCard showTools branch)
    expect(screen.getAllByText('Đọc web').length).toBeGreaterThan(0)
  })

  it('Settings shows providers and the advanced card', async () => {
    renderWithStore(<App />, (s) => s.v.goSettings())
    expect(await screen.findByText('Chế độ nâng cao')).toBeInTheDocument()
    expect(screen.getByText('NOVA DÙNG MÔ HÌNH')).toBeInTheDocument()
  })

  it('Settings in advanced mode reveals the custom-provider row + skill chips', async () => {
    renderWithStore(<App />, (s) => s.set({ view: 'settings', advanced: true }))
    expect(await screen.findByText(/Thêm nhà cung cấp tùy chỉnh/)).toBeInTheDocument()
  })
})

describe('overlays render on demand', () => {
  it('Inspector opens with the context panel', async () => {
    renderWithStore(<App />, (s) => s.set({ inspector: true }))
    expect(await screen.findByText('TÀI LIỆU TRONG CHAT')).toBeInTheDocument()
  })

  it('quiet (focus) mode takes over the screen', async () => {
    renderWithStore(<App />, (s) => s.v.enterQuiet())
    expect(await screen.findByText(/TẬP TRUNG/)).toBeInTheDocument()
  })
})
