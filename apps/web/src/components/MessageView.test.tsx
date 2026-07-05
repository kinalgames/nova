import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { streamChat, type StreamHandlers } from '../services/llm'
import { addSibling, fromLinear } from '../state/thread'
import type { Message, MsgAttachment } from '../state/types'
import type { ChatProxyRequest } from '@nova/shared'

// regenerate / edit-and-rerun stream through the REAL send path — mock the
// proxy transport so each test controls the stream (instant or hanging)
vi.mock('../services/llm', () => ({
  API_BASE: 'http://localhost:8787',
  HAS_API: true,
  streamChat: vi.fn(async (_req: ChatProxyRequest, h: StreamHandlers) => {
    h.onDelta('Trả lời mới')
    h.onDone({ inputTokens: 3, outputTokens: 2 })
  }),
}))

/** one reply that never finishes — the test stops it through the UI */
const hangingStream = () =>
  vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
    h.onDelta('đang viết…')
    await new Promise<never>(() => {})
  })

beforeEach(() => {
  localStorage.clear()
  vi.mocked(streamChat).mockClear()
})

const msg = (id: string, role: Message['role'], text: string): Message => ({
  id,
  role,
  who: role === 'user' ? 'THÀNH' : 'NOVA',
  blocks: [{ type: 'text', text }],
})

const linear = () =>
  fromLinear([msg('u1', 'user', 'Prompt gốc'), msg('a1', 'assistant', 'Trả lời một')])

const forked = () => addSibling(linear(), 'a1', msg('a2', 'assistant', 'Trả lời hai'))

const seed = (thread: ReturnType<typeof linear>) => async () =>
  renderApp((s) => s.set({ activeConv: 'c1', threads: { c1: thread } }))

const imgMsg = (att: Partial<MsgAttachment>): Message => ({
  id: 'u9',
  role: 'user',
  who: 'THÀNH',
  blocks: [
    { type: 'text', text: 'ảnh đây' },
    { type: 'files', items: [{ kind: 'image', name: 'chart.png', image: true, ...att }] },
  ],
})

describe('B1 — real image tiles', () => {
  it('renders the session object URL instantly and opens it on click', async () => {
    const user = makeUser()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([imgMsg({ url: 'blob:local-1' })]) } }),
    )
    const tile = await screen.findByRole('button', { name: /chart\.png/ })
    expect(tile.getAttribute('style')).toContain('blob:local-1')
    await user.click(tile)
    expect(openSpy).toHaveBeenCalledWith('blob:local-1', '_blank', 'noopener')
    openSpy.mockRestore()
  })

  it('fetches by fileId after a reload; failure keeps the gradient placeholder', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['img']), { status: 200 })),
    )
    URL.createObjectURL = vi.fn(() => 'blob:fetched-1')
    URL.revokeObjectURL = vi.fn()
    await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([imgMsg({ fileId: 'srv-9' })]) } }),
    )
    const tile = await screen.findByRole('button', { name: /chart\.png/ })
    await waitFor(() => expect(tile.getAttribute('style')).toContain('blob:fetched-1'))
  })

  it('a sourceless tile (no url, no fileId) keeps the gradient; clicking it\n     opens the preview lightbox instead of a dead tab', async () => {
    const user = makeUser()
    await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([imgMsg({})]) } }),
    )
    const tile = await screen.findByRole('button', { name: /chart\.png/ })
    expect(tile.getAttribute('style')).toContain('linear-gradient')
    await user.click(tile)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('version navigator ‹ i/n ›', () => {
  // generous timeout: the file's FIRST test bears the whole import/transform
  // cost under coverage instrumentation on slow parallel runs
  it('walks between reply versions and clamps at the edges', { timeout: 15_000 }, async () => {
    const user = makeUser()
    await seed(forked())()

    expect(await screen.findByText('Trả lời hai')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()

    const prev = screen.getByRole('button', { name: 'Phiên bản trước' })
    const next = screen.getByRole('button', { name: 'Phiên bản sau' })
    expect(next).toBeDisabled()

    await user.click(prev)
    expect(screen.getByText('Trả lời một')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phiên bản trước' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Phiên bản sau' }))
    expect(screen.getByText('Trả lời hai')).toBeInTheDocument()
  })
})

describe('per-message actions', () => {
  it('copies a message through the clipboard', async () => {
    const user = makeUser()
    const write = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    })
    await seed(linear())()

    await screen.findByText('Prompt gốc')
    const copies = screen.getAllByRole('button', { name: 'Sao chép' })
    await user.click(copies[0])
    expect(write).toHaveBeenCalledWith('Prompt gốc')
  })

  it('toggles feedback — up, switch to down, off again', async () => {
    const user = makeUser()
    await seed(linear())()

    const good = await screen.findByRole('button', { name: 'Hữu ích' })
    const bad = screen.getByRole('button', { name: 'Chưa tốt' })

    await user.click(good)
    expect(good).toHaveAttribute('aria-pressed', 'true')

    await user.click(bad)
    expect(bad).toHaveAttribute('aria-pressed', 'true')
    expect(good).toHaveAttribute('aria-pressed', 'false')

    await user.click(bad)
    expect(bad).toHaveAttribute('aria-pressed', 'false')
  })

  it('regenerates a reply as a new version, stoppable mid-stream', async () => {
    const user = makeUser()
    hangingStream()
    await seed(linear())()

    await user.click(await screen.findByRole('button', { name: 'Tạo lại' }))
    expect(await screen.findByText('Đang viết câu trả lời…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Dừng/ }))
    expect(screen.queryByText('Đang viết câu trả lời…')).not.toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })
})

describe('T2 — live thinking trace', () => {
  it('streams the trace OPEN while typing; stop settles it collapsed', async () => {
    const user = makeUser()
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onThinking?.('Suy luận bước một…')
      await new Promise<never>(() => {})
    })
    await seed(linear())()

    await user.click(await screen.findByRole('button', { name: 'Tạo lại' }))
    // while streaming, thinking-only renders as muted text ALONE — no card,
    // no separate “Đang suy nghĩ…” label duplicating it
    expect(await screen.findByText('Suy luận bước một…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Dừng/ }))
    // stop() settles the aborted phase — it collapses to the one-line summary
    // (never a stale full thinking transcript sitting open)
    expect(await screen.findByText('Quá trình suy nghĩ · 1 giây')).toBeInTheDocument()
    expect(screen.queryByText('Suy luận bước một…')).not.toBeInTheDocument()
  })
})

describe('T3 — sources block: one trigger, a list with real titles + favicons', () => {
  it('shows a single "N nguồn" trigger; opening it lists each source, real urls open a new tab, legacy items open the in-app preview', async () => {
    const user = makeUser()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const msgSrc: Message = {
      id: 'a9',
      role: 'assistant',
      who: 'NOVA',
      blocks: [
        { type: 'text', text: 'Theo [1]…' },
        {
          type: 'sources',
          items: [
            { n: 1, label: 'sjc.vn', title: 'Giá vàng SJC', url: 'https://www.sjc.vn/gia' },
            { n: 2, label: 'báo cáo.md', open: 'md' },
          ],
        },
      ],
    }
    await renderApp((s) => s.set({ activeConv: 'c1', threads: { c1: fromLinear([msgSrc]) } }))
    // the spread-out chip row collapses into ONE trigger showing the count
    const trigger = await screen.findByRole('button', { name: '2 nguồn' })
    expect(screen.queryByText('sjc.vn')).not.toBeInTheDocument()

    await user.click(trigger)
    expect(await screen.findByText('Giá vàng SJC')).toBeInTheDocument()
    expect(screen.getByText('báo cáo.md')).toBeInTheDocument()

    await user.click(screen.getByText('Giá vàng SJC'))
    expect(openSpy).toHaveBeenCalledWith('https://www.sjc.vn/gia', '_blank', 'noopener')

    await user.click(trigger)
    await user.click(screen.getByText('báo cáo.md'))
    // legacy item → in-app preview (no extra window.open)
    expect(openSpy).toHaveBeenCalledTimes(1)
    openSpy.mockRestore()
  })
})

describe('real error card', () => {
  const seedError = (
    errorAction: 'providers' | 'retry',
    errorDetail: string,
  ) => async () =>
    renderApp((s) =>
      s.set({
        activeConv: 'c1',
        threads: { c1: fromLinear([msg('u1', 'user', 'Hỏi gì đó'), msg('a1', 'assistant', '')]) },
        respState: 'error',
        errorConv: 'c1',
        errorAction,
        errorDetail,
      }),
    )

  it('no-provider error shows the card + an Add-provider button (not silence)', async () => {
    const user = makeUser()
    await seedError('providers', 'Bạn chưa thêm khóa API nào.')()
    expect(await screen.findByText('Chưa có nhà cung cấp AI')).toBeInTheDocument()
    expect(screen.getByText('Bạn chưa thêm khóa API nào.')).toBeInTheDocument()
    // the recovery button opens provider settings (covers the providers branch)
    const cta = screen.getByRole('button', { name: 'Thêm nhà cung cấp' })
    await user.click(cta)
  })

  it('provider error shows the specific message + a Retry that regenerates', async () => {
    const user = makeUser()
    hangingStream()
    await seedError('retry', 'rate_limited: quá tải')()
    expect(await screen.findByText('rate_limited: quá tải')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    // retry re-runs the reply as a new streaming version
    expect(await screen.findByText('Đang viết câu trả lời…')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Dừng/ }))
  })
})

describe('inline edit-and-rerun', () => {
  it('opens prefilled, cancels without changes', async () => {
    const user = makeUser()
    await seed(linear())()

    await screen.findByText('Prompt gốc')
    await user.click(screen.getByRole('button', { name: 'Sửa' }))
    const box = screen.getByRole('textbox', { name: 'Sửa tin nhắn' })
    expect(box).toHaveValue('Prompt gốc')

    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('textbox', { name: 'Sửa tin nhắn' })).not.toBeInTheDocument()
    expect(screen.getByText('Prompt gốc')).toBeInTheDocument()
  })

  it('saves an edit as a new prompt version and re-runs the reply', async () => {
    const user = makeUser()
    hangingStream()
    await seed(linear())()

    await screen.findByText('Prompt gốc')
    await user.click(screen.getByRole('button', { name: 'Sửa' }))
    const box = screen.getByRole('textbox', { name: 'Sửa tin nhắn' })
    await user.clear(box)
    await user.type(box, 'Prompt chỉnh sửa')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Prompt chỉnh sửa')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(await screen.findByText('Đang viết câu trả lời…')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Dừng/ }))
  })
})

describe('coverage — file pills open by kind + error retry', () => {
  const fileMsg = (open: 'md' | 'csv'): Message => ({
    id: 'u7',
    role: 'user',
    who: 'THÀNH',
    blocks: [
      { type: 'text', text: 'tệp đây' },
      { type: 'files', items: [{ kind: open, name: `plan.${open}`, open }] },
    ],
  })

  it('a markdown pill opens the md preview; a csv pill opens the csv preview', async () => {
    const user = makeUser()
    const { store } = await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([fileMsg('md')]) } }),
    )
    await user.click(await screen.findByRole('button', { name: /plan\.md/ }))
    expect(store().s.preview?.kind).toBe('md')

    const { store: store2 } = await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([fileMsg('csv')]) } }),
    )
    await user.click(await screen.findByRole('button', { name: /plan\.csv/ }))
    expect(store2().s.preview?.kind).toBe('csv')
  })

  it('the error card retry button regenerates the reply', async () => {
    const user = makeUser()
    const { store } = await renderApp((s) =>
      s.set({
        activeConv: 'c1',
        threads: { c1: fromLinear([msg('u1', 'user', 'hỏi'), msg('a1', 'assistant', '')]) },
        respState: 'error',
        errorAction: 'retry',
        errorConv: 'c1',
        errorDetail: 'boom',
      }),
    )
    await user.click(await screen.findByRole('button', { name: /Thử lại/ }))
    // retry drives regenerate → respState leaves the error state
    await waitFor(() => expect(store().s.respState).not.toBe('error'))
  })
})

describe('coverage — error card variants + file kinds', () => {
  const errThread = () =>
    fromLinear([msg('u1', 'user', 'hỏi'), msg('a1', 'assistant', '')])

  it('the no-provider error card offers "add provider" and routes to settings', async () => {
    const user = makeUser()
    const { store } = await renderApp((s) =>
      s.set({
        activeConv: 'c1',
        threads: { c1: errThread() },
        respState: 'error',
        errorAction: 'providers',
        errorConv: 'c1',
        errorDetail: 'no provider',
      }),
    )
    await user.click(await screen.findByRole('button', { name: /Thêm nhà cung cấp/ }))
    expect(store().v.settingsTab).toBe('providers')
  })

  it('a generic error card (no action) just clears back to done', async () => {
    const user = makeUser()
    const { store } = await renderApp((s) =>
      s.set({
        activeConv: 'c1',
        threads: { c1: errThread() },
        respState: 'error',
        errorAction: null,
        errorConv: 'c1',
        errorDetail: 'lỗi lạ',
      }),
    )
    await user.click(await screen.findByRole('button', { name: /Thử lại/ }))
    await waitFor(() => expect(store().s.respState).toBe('done'))
  })

  it('pdf and code file pills open their previews', async () => {
    const user = makeUser()
    const pill = (open: 'pdf' | 'code'): Message => ({
      id: 'u6',
      role: 'user',
      who: 'THÀNH',
      blocks: [
        { type: 'text', text: 'tệp' },
        { type: 'files', items: [{ kind: open, name: `x.${open}`, open }] },
      ],
    })
    const { store } = await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([pill('pdf')]) } }),
    )
    await user.click(await screen.findByRole('button', { name: /x\.pdf/ }))
    expect(store().s.preview?.kind).toBe('pdf')

    const { store: s2 } = await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([pill('code')]) } }),
    )
    await user.click(await screen.findByRole('button', { name: /x\.code/ }))
    expect(s2().s.preview?.kind).toBe('code')
  })
})
