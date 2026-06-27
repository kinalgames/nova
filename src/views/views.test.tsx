import { useEffect } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { StoreProvider, useStore } from '../state/store'

// Drive the store to a given handler once on mount, then render the app, so we
// can exercise every view's render path (they only mount when active).
function Drive({ run }: { run: string }) {
  const { v } = useStore()
  useEffect(() => {
    ;(v as unknown as Record<string, () => void>)[run]?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])
  return null
}

function renderAt(run: string) {
  return render(
    <StoreProvider>
      <Drive run={run} />
      <App />
    </StoreProvider>,
  )
}
beforeEach(() => localStorage.clear())

describe('views render on navigation', () => {
  it('Home shows the greeting and intent suggestions', async () => {
    renderAt('goHome')
    expect(await screen.findByText(/Mình là Nova/)).toBeInTheDocument()
    expect(screen.getByText('Lên kế hoạch')).toBeInTheDocument()
  })

  it('Projects lists the default + sample projects', async () => {
    renderAt('goProjects')
    expect(await screen.findByText(/Mỗi dự án có hướng dẫn/)).toBeInTheDocument()
  })

  it('Project config shows instructions and files', async () => {
    renderAt('goProjectCfg')
    expect(await screen.findByText('GIỚI THIỆU DỰ ÁN')).toBeInTheDocument()
    expect(screen.getByText('TỆP DỰ ÁN')).toBeInTheDocument()
  })

  it('Nova shows the assistant config', async () => {
    renderAt('goAssistant')
    expect(await screen.findByText('HƯỚNG DẪN HỆ THỐNG')).toBeInTheDocument()
  })

  it('Settings shows providers and the advanced card', async () => {
    renderAt('goSettings')
    expect(await screen.findByText('Chế độ nâng cao')).toBeInTheDocument()
    expect(screen.getByText('NOVA DÙNG MÔ HÌNH')).toBeInTheDocument()
  })
})

describe('overlays render on demand', () => {
  it('Inspector opens with the context panel', async () => {
    renderAt('toggleInspector')
    expect(await screen.findByText('TÀI LIỆU TRONG CHAT')).toBeInTheDocument()
  })

  it('the PDF preview opens as a dialog', async () => {
    renderAt('openPdf')
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Aurora — Brief')).toBeInTheDocument()
  })

  it('quiet (focus) mode takes over the screen', async () => {
    renderAt('enterQuiet')
    expect(await screen.findByText(/TẬP TRUNG/)).toBeInTheDocument()
  })

  it('logging out reveals the auth screen', async () => {
    renderAt('logout')
    expect(await screen.findByText('Tiếp tục với Google')).toBeInTheDocument()
  })
})
