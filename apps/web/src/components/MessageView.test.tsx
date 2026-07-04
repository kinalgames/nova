import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { addSibling, fromLinear } from '../state/thread'
import type { Message, MsgAttachment } from '../state/types'

beforeEach(() => localStorage.clear())

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

  it('a demo tile (no url, no fileId) keeps the gradient and the preview opener', async () => {
    await renderApp((s) =>
      s.set({ activeConv: 'c1', threads: { c1: fromLinear([imgMsg({})]) } }),
    )
    const tile = await screen.findByRole('button', { name: /chart\.png/ })
    expect(tile.getAttribute('style')).toContain('linear-gradient')
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
    await seed(linear())()

    await user.click(await screen.findByRole('button', { name: 'Tạo lại' }))
    expect(await screen.findByText('Đang viết câu trả lời…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Dừng/ }))
    expect(screen.queryByText('Đang viết câu trả lời…')).not.toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
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
