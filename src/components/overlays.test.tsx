import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, makeUser } from '../test/util'

beforeEach(() => localStorage.clear())

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
