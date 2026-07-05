// D1/T3 — native web search/fetch: capability-gated request flags, live tool
// trace steps, and the sources block built from provider citations.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { msgText, renderStore } from '../test/util'
import { streamChat, type StreamHandlers } from '../services/llm'
import type { ChatProxyRequest } from '@nova/shared'

const calls: ChatProxyRequest[] = []

vi.mock('../services/llm', () => ({
  API_BASE: 'http://localhost:8787',
  HAS_API: true,
  streamChat: vi.fn(async (req: ChatProxyRequest, h: StreamHandlers) => {
    calls.push(req)
    h.onDelta('Trả lời thường')
    h.onDone({ inputTokens: 3, outputTokens: 2 })
  }),
}))

beforeEach(() => {
  localStorage.clear()
  calls.length = 0
  vi.mocked(streamChat).mockClear()
})

async function withRealProfile() {
  const handle = await renderStore()
  await act(async () =>
    handle.result.current.set((x) => ({
      profiles: {
        ...x.profiles,
        claude: [
          { id: 'pf-real', name: 'Khóa thật', kind: 'api_key', credential: 'sk-ant-real-123', status: 'active' },
        ],
      },
    })),
  )
  return handle
}

describe('T3 — capability-gated search/fetch request flags', () => {
  it('flags ride ONLY when the tool is on AND the model has webSearch', { timeout: 15_000 }, async () => {
    const { result } = await withRealProfile()
    // default: tools off → no flags at all
    await act(async () => result.current.set({ draft: 'câu một' }))
    await act(async () => result.current.v.send())
    expect(calls[0].search).toBeUndefined()
    expect(calls[0].fetch).toBeUndefined()

    // toggled on → the capable default model (claude opus) carries them
    await act(async () => result.current.v.toggle_web())
    await act(async () => result.current.v.toggle_fetch())
    await act(async () => result.current.v.toggle_files())
    await act(async () => result.current.set({ draft: 'câu hai' }))
    await act(async () => result.current.v.send())
    expect(calls[1].search).toBe(true)
    expect(calls[1].fetch).toBe(true)
    // T5 — files rides on toolUse capability
    expect(calls[1].files).toBe(true)
  })

  it('an ollama model without webSearch never sees the flags — rows go inert', async () => {
    const { result } = await withRealProfile()
    await act(async () => result.current.v.toggle_web())
    await act(async () =>
      result.current.set((x) => ({
        profiles: {
          ...x.profiles,
          ollama: [
            { id: 'pf-oll', name: 'Máy này', kind: 'api_key', credential: 'http://localhost:11434', status: 'active' },
          ],
        },
        slots: { ...x.slots, smart: { providerId: 'ollama', modelId: 'ornith:35b' } },
      })),
    )
    // the rows render faint and the toggle is a no-op on an unsupported model
    expect(result.current.v.webRowFg).toBe('var(--faint)')
    const was = result.current.s.tools.fetch
    await act(async () => result.current.v.toggle_fetch())
    expect(result.current.s.tools.fetch).toBe(was)

    await act(async () => result.current.set({ draft: 'hỏi local' }))
    await act(async () => result.current.v.send())
    expect(calls[0].search).toBeUndefined()
    expect(calls[0].fetch).toBeUndefined()
  })
})

describe('T3 — tool events build the live trace + sources block', () => {
  it('search results become a tool step with query, count and numbered sources', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onToolStart?.('t1', 'web_search')
      h.onToolDelta?.('t1', '{"query":"giá vàng hôm nay"}')
      h.onToolResult?.('t1', true, undefined, [
        { n: 1, url: 'https://www.sjc.vn/gia', title: 'SJC' },
        { n: 2, url: 'https://pnj.vn', title: 'PNJ' },
      ])
      h.onDelta('Theo [1], giá vàng…')
      h.onDone({ inputTokens: 9, outputTokens: 6 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'giá vàng?' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    expect(msgText(nova)).toBe('Theo [1], giá vàng…')

    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.summary).toBe('Đã tra cứu web')
    expect(trace.meta).toBe('2 nguồn · 1 giây')
    expect(trace.steps[0]).toMatchObject({
      kind: 'tool',
      title: 'Tìm kiếm web',
      // the real first result's title rides along — not just a bare count
      detail: '2 nguồn — SJC',
      query: 'giá vàng hôm nay',
      toolIcon: 'search',
      node: 'accent',
    })

    const src = nova.blocks.find((b) => b.type === 'sources')
    if (src?.type !== 'sources') throw new Error('expected a sources block')
    // labels are bare hostnames (www. stripped); urls open the real page
    expect(src.items).toEqual([
      { n: 1, label: 'sjc.vn', url: 'https://www.sjc.vn/gia' },
      { n: 2, label: 'pnj.vn', url: 'https://pnj.vn' },
    ])
  })

  it('T5 — a files call renders its own title/icon and the executor summary', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onToolStart?.('c1', 'files')
      h.onToolResult?.('c1', true, '2 files')
      h.onToolStart?.('c2', 'files')
      h.onToolResult?.('c2', true) // no summary, no sources → plain check
      h.onDelta('Bạn có 2 tệp.')
      h.onDone({ inputTokens: 5, outputTokens: 4 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'tệp của tôi?' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.steps[0]).toMatchObject({
      kind: 'tool',
      title: 'Đọc tệp của bạn',
      detail: '2 files',
      toolIcon: 'file',
    })
    expect(trace.steps[1]).toMatchObject({ detail: '✓' })
  })

  it('T5 — a failure without an error code falls back to the generic label; ugly source urls keep their raw label', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onToolStart?.('t1', 'web_search')
      h.onToolResult?.('t1', false)
      h.onToolStart?.('t2', 'web_search')
      h.onToolResult?.('t2', true, undefined, [{ n: 1, url: 'không-phải-url', title: 'X' }])
      h.onDelta('xong')
      h.onDone({ inputTokens: 1, outputTokens: 1 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'lỗi?' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.steps[0]).toMatchObject({ detail: 'không lấy được', node: 'danger' })
    const src = nova.blocks.find((b) => b.type === 'sources')
    if (src?.type !== 'sources') throw new Error('expected sources')
    expect(src.items[0].label).toBe('không-phải-url')
  })

  it('T5 — mid-flight the step shows … and the searching summary; stop() settles it', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onToolStart?.('t1', 'web_search')
      await new Promise<never>(() => {})
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'đang tìm' }))
    await act(async () => result.current.v.send())

    let nova = result.current.v.sent.at(-1)!
    let trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.summary).toBe('Đang tra cứu web…')
    expect(trace.steps[0]).toMatchObject({ detail: '…', node: 'accent' })

    await act(async () => result.current.v.stop())
    nova = result.current.v.sent.at(-1)!
    trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.summary).toBe('Đã tra cứu web')
    expect(trace.steps[0]).toMatchObject({ detail: '✓' })
  })

  it('T5/chain-action — a short lead reply + ≥ 2 think/tool steps becomes a chain: the lead becomes the summary, the trace ends with a done step, and the final text is the answer alone', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onDelta('Để mình kiểm tra giúp bạn.')
      h.onThinking?.('Cần tra cứu trước.')
      h.onToolStart?.('t1', 'web_search')
      h.onToolResult?.('t1', true, undefined, [{ n: 1, url: 'https://a.vn', title: 'A' }])
      h.onDelta('Xong, kết quả là X.')
      h.onDone({ inputTokens: 9, outputTokens: 6 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'kiểm tra giúp' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    // the lead-in never repeats in the body — only the post-phase answer does
    expect(msgText(nova)).toBe('Xong, kết quả là X.')

    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.summary).toBe('Để mình kiểm tra giúp bạn.')
    expect(trace.steps).toHaveLength(3)
    expect(trace.steps[0]).toMatchObject({ kind: 'think' })
    expect(trace.steps[1]).toMatchObject({ kind: 'tool' })
    expect(trace.steps[2]).toMatchObject({ kind: 'done', title: 'Hoàn tất', detail: '· 1 giây' })
  })

  it('T5/chain-action — a lead reply followed by only 1 tool step stays plain: generic summary, no done step, lead + answer concatenate', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onDelta('Để mình xem thử.')
      h.onToolStart?.('t1', 'web_search')
      h.onToolResult?.('t1', true, undefined, [{ n: 1, url: 'https://a.vn', title: 'A' }])
      h.onDelta(' Xong rồi.')
      h.onDone({ inputTokens: 5, outputTokens: 4 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'xem giúp' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    expect(msgText(nova)).toBe('Để mình xem thử. Xong rồi.')

    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.summary).toBe('Đã tra cứu web')
    expect(trace.steps).toHaveLength(1)
    expect(trace.steps.some((st) => st.kind === 'done')).toBe(false)
  })

  it('a failed fetch renders a danger step with its error code, no sources block', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onToolStart?.('t9', 'web_fetch')
      h.onToolResult?.('t9', false, 'url_not_accessible')
      h.onDelta('Không đọc được trang đó.')
      h.onDone({ inputTokens: 4, outputTokens: 3 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'đọc trang này' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.steps[0]).toMatchObject({
      kind: 'tool',
      title: 'Đọc trang web',
      detail: 'url_not_accessible',
      toolIcon: 'globe',
      node: 'danger',
    })
    expect(nova.blocks.some((b) => b.type === 'sources')).toBe(false)
  })
})
