import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('ConversationView — data-driven message blocks', () => {
  it('renders the showcase thread from data: text, table, sources, file blocks', async () => {
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
    // the actions-block button carries visible text (ActionRow is icon-only)
    await user.click((await screen.findAllByText('Sao chép'))[0])
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

  it('shows a jump-to-bottom control when scrolled away, and it scrolls down', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1' })
    const region = screen.getByRole('region', { name: 'Hội thoại' })
    Object.defineProperty(region, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(region, 'clientHeight', { value: 400, configurable: true })
    region.scrollTop = 100
    fireEvent.scroll(region)
    const btn = await screen.findByRole('button', { name: 'Cuộn xuống cuối' })
    await user.click(btn)
    expect(region.scrollTop).toBe(1000)
  })

  it('trace hides raw tool rows when advanced is off', async () => {
    await renderApp((s) => s.set({ advanced: false, traceOpen: true }), { path: '/chat/c1' })
    expect(await screen.findByText(/Cần số liệu benchmark/)).toBeInTheDocument()
    expect(screen.queryByText('web_search')).not.toBeInTheDocument()
  })

  it('a sent message with a staged attachment renders a file block', async () => {
    const user = makeUser()
    await renderApp(undefined, { path: '/chat/c1' })
    // fixture c1 stages two attachments; send consumes them into the message
    await user.type(screen.getByRole('textbox', { name: 'Nhắn cho Nova' }), 'kèm theo tệp')
    await user.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(await screen.findByText('kèm theo tệp')).toBeInTheDocument()
    // the staged Brief pdf is now part of the sent message
    expect((await screen.findAllByText('Brief-Aurora.pdf')).length).toBeGreaterThan(0)
  })
})

describe('ConversationView — response states', () => {
  it('error shows the interrupted banner with a retry', async () => {
    // a REAL error is conv-scoped — errorConv must point at the open thread
    await renderApp((s) => s.set({ respState: 'error', errorConv: 'c1', errorAction: 'retry' }))
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
    // the trace terminal checkpoint lives in the timeline
    expect(nodes.some((n) => !n.closest('button'))).toBe(true)
  })

  it('a fresh chat lands on the home composer (no conversation yet)', async () => {
    await renderApp((s) => s.v.pNewChat())
    expect(await screen.findByText(/Bạn muốn làm gì hôm nay/)).toBeInTheDocument()
  })
})

describe('ConversationView — threads never leak across conversations', () => {
  it('c2 shows its own thread, never another conversation\u2019s answer', async () => {
    await renderApp((s) => s.set({ respState: 'done' }), { path: '/chat/c2' })
    // the c2 thread is shown
    expect(await screen.findByText(/Viết giúp mình đoạn mở đầu/)).toBeInTheDocument()
    // c1's benchmark answer must NOT appear
    expect(screen.queryByText(/đối chiếu khảo sát với 6 đối thủ/)).not.toBeInTheDocument()
  })

  it('a fresh chat shows only the home composer, no scripted answer', async () => {
    await renderApp((s) => s.v.pNewChat())
    expect(await screen.findByText(/Bạn muốn làm gì hôm nay/)).toBeInTheDocument()
    expect(screen.queryByText(/đối chiếu khảo sát với 6 đối thủ/)).not.toBeInTheDocument()
  })

  it('real world without a provider: the empty chat IS the connect card', async () => {
    localStorage.setItem('nova.auth.token', 'tok') // past the auth gate
    await renderApp(undefined, {
      world: 'real',
      path: '/chat/r1',
      storeInit: {
        conversations: [{ id: 'r1', title: 'Mới', projectId: 'chung', updatedAt: 1 }],
        threads: {},
      },
    })
    // the full nudge replaces the greeting — no silent empty screen
    expect(await screen.findByText(/Kết nối nhà cung cấp/)).toBeInTheDocument()
    // anonymous → the CTA asks to sign in first (line-37 branch)
    expect(screen.getByRole('button', { name: /Đăng nhập để bắt đầu/ })).toBeInTheDocument()
    expect(screen.queryByText(/Hỏi bất cứ điều gì/)).not.toBeInTheDocument()
  })

  it('signed-in without a provider: the full nudge CTA goes to providers', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    await renderApp(undefined, {
      world: 'real',
      path: '/chat/r1',
      storeInit: {
        accountId: 'acc-1',
        conversations: [{ id: 'r1', title: 'Mới', projectId: 'chung', updatedAt: 1 }],
        threads: {},
      },
    })
    expect(await screen.findByText(/Kết nối nhà cung cấp/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm nhà cung cấp/ })).toBeInTheDocument()
  })

  it('an empty conversation WITH a provider greets with the empty-chat hero', async () => {
    await renderApp(undefined, {
      path: '/chat/r9',
      storeInit: {
        conversations: [{ id: 'r9', title: null, projectId: 'chung', updatedAt: 1 }],
        threads: {},
        // a configured profile → no nudge; the greeting owns the empty state
        profiles: {
          claude: [
            { id: 'p1', name: 'Khóa', kind: 'api_key', credential: 'sk-x', status: 'active' },
          ],
          gemini: [],
          openai: [],
          ollama: [],
        },
      },
    })
    // the greeting body is unique; the title also exists as a sidebar button,
    // so assert the HERO copy (display face) specifically
    expect(await screen.findByText(/Hỏi bất cứ điều gì/)).toBeInTheDocument()
    const heroes = screen.getAllByText('Cuộc trò chuyện mới')
    expect(heroes.some((n) => n.classList.contains('font-display'))).toBe(true)
  })
})
