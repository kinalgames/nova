import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('ConversationView — data-driven message blocks', () => {
  it('renders the demo from data: text, table, sources, file blocks', async () => {
    await renderApp(undefined, { path: '/chat/c1' })
    expect(await screen.findByText('Kích hoạt 72h')).toBeInTheDocument() // table head
    expect((await screen.findAllByText('plan.md')).length).toBeGreaterThan(0) // file block
    expect(screen.getByText(/techreview/)).toBeInTheDocument() // source chip
  })

  it('a non-image file pill opens its preview', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1' })
    await user.click(await screen.findByRole('button', { name: /plan\.md 2\.1 KB/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('the moodboard image tile opens a preview', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1' })
    await user.click(await screen.findByText('moodboard.png'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('message actions run (copy marks copied, open shows a preview)', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/chat/c1' })
    await user.click((await screen.findAllByRole('button', { name: /Sao chép/ }))[0])
    expect(store().s.copied).toBe(true)
    await user.click((await screen.findAllByRole('button', { name: /Mở plan\.md/ }))[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('a source chip opens its preview', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1' })
    await user.click(await screen.findByRole('button', { name: /techreview/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('trace hides raw tool rows when advanced is off', async () => {
    await renderApp((s) => s.set({ advanced: false, traceOpen: true }), { path: '/chat/c1' })
    expect(await screen.findByText(/Cần số liệu benchmark/)).toBeInTheDocument()
    expect(screen.queryByText('web_search')).not.toBeInTheDocument()
  })

  it('a sent message with a staged attachment renders a file block', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1' })
    // c1 seeds two staged demo attachments; send consumes them into the message
    await user.type(screen.getByRole('textbox', { name: 'Nhắn cho Nova' }), 'kèm theo tệp')
    await user.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(await screen.findByText('kèm theo tệp')).toBeInTheDocument()
    // the staged Brief pdf is now part of the sent message
    expect((await screen.findAllByText('Brief-Aurora.pdf')).length).toBeGreaterThan(0)
  })
})

describe('ConversationView — response states', () => {
  it('streaming shows the live "writing" indicator and a stop control', async () => {
    await renderApp((s) => s.set({ respState: 'stream' }))
    expect(await screen.findByText(/Đang viết câu trả lời/)).toBeInTheDocument()
    expect(screen.getByText('Dừng')).toBeInTheDocument()
  })

  it('streaming shows an animated Nova working indicator', async () => {
    await renderApp((s) => s.set({ respState: 'stream' }))
    expect(await screen.findByLabelText('Nova đang làm việc')).toBeInTheDocument()
  })

  it('error shows the interrupted banner with a retry', async () => {
    await renderApp((s) => s.set({ respState: 'error' }))
    expect(await screen.findByText('Phản hồi bị gián đoạn')).toBeInTheDocument()
  })

  it('approval shows the permission prompt for a bash command', async () => {
    await renderApp((s) => s.set({ respState: 'approval' }))
    expect(await screen.findByText('Cho phép')).toBeInTheDocument()
    expect(screen.getByText('Từ chối')).toBeInTheDocument()
  })

  it('advanced mode reveals the raw tool trace when expanded', async () => {
    await renderApp((s) => s.set({ advanced: true, traceOpen: true, respState: 'done' }))
    expect(await screen.findByText('web_search')).toBeInTheDocument()
    expect(screen.getByText('read_file')).toBeInTheDocument()
  })

  it('trace shows the thinking step but no "SUY NGHĨ" label', async () => {
    await renderApp((s) => s.set({ advanced: true, traceOpen: true, respState: 'done' }))
    expect(await screen.findByText(/Cần số liệu benchmark/)).toBeInTheDocument()
    expect(screen.queryByText('SUY NGHĨ')).not.toBeInTheDocument()
  })

  it('expanded trace ends with a "Hoàn tất" checkpoint when done', async () => {
    await renderApp((s) => s.set({ traceOpen: true, respState: 'done' }))
    const nodes = await screen.findAllByText('Hoàn tất')
    // the trace terminal checkpoint lives in the timeline, not the demo switcher button
    expect(nodes.some((n) => !n.closest('button'))).toBe(true)
  })

  it('a fresh chat shows the empty state', async () => {
    await renderApp((s) => s.v.pNewChat())
    expect(await screen.findByText(/Hỏi bất cứ điều gì/)).toBeInTheDocument()
  })
})

describe('ConversationView — demo content is scoped to the demo conversation', () => {
  it('does not leak the scripted answer into a real conversation', async () => {
    await renderApp((s) => s.set({ respState: 'done' }), { path: '/chat/c2' })
    // the real c2 thread is shown
    expect(await screen.findByText(/Viết giúp mình đoạn mở đầu/)).toBeInTheDocument()
    // the Aurora benchmark answer (demo-only) must NOT appear
    expect(screen.queryByText(/đối chiếu khảo sát với 6 đối thủ/)).not.toBeInTheDocument()
    // nor the demo state switcher
    expect(screen.queryByText('demo:')).not.toBeInTheDocument()
  })

  it('a fresh chat shows only the empty state, no scripted answer', async () => {
    await renderApp((s) => s.v.pNewChat())
    expect(await screen.findByText(/Hỏi bất cứ điều gì/)).toBeInTheDocument()
    expect(screen.queryByText(/đối chiếu khảo sát với 6 đối thủ/)).not.toBeInTheDocument()
  })

  it('shows the demo state switcher on the demo conversation', async () => {
    await renderApp()
    expect(await screen.findByText('demo:')).toBeInTheDocument()
  })
})
