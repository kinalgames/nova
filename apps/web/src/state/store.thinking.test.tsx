// T2 — live thinking: thinking_delta events build a trace block above the
// reply text; the block persists (collapsed) with the measured duration.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { msgText, renderStore } from '../test/util'
import { streamChat, type StreamHandlers } from '../services/llm'
import type { ChatProxyRequest } from '@nova/shared'

vi.mock('../services/llm', () => ({
  API_BASE: 'http://localhost:8787',
  HAS_API: true,
  streamChat: vi.fn(async (_req: ChatProxyRequest, h: StreamHandlers) => {
    h.onThinking?.('Phân tích ')
    h.onThinking?.('yêu cầu…')
    h.onDelta('Trả lời đây')
    h.onDone({ inputTokens: 9, outputTokens: 4 })
  }),
}))

beforeEach(() => {
  localStorage.clear()
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

describe('T2 — thinking stream renders as a persistent trace block', () => {
  it('accumulates thinking into ONE think step, settles summary + duration on done', { timeout: 15_000 }, async () => {
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'câu hỏi khó' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    expect(nova.role).toBe('assistant')
    expect(msgText(nova)).toBe('Trả lời đây')

    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.steps).toEqual([{ kind: 'think', text: 'Phân tích yêu cầu…' }])
    // the phase settled: summary flips to “done” and the meta carries seconds
    expect(trace.summary).toBe('Quá trình suy nghĩ')
    expect(trace.meta).toMatch(/giây/)
    // the reply text lives OUTSIDE the trace, after it
    expect(nova.blocks.at(-1)).toMatchObject({ type: 'text', text: 'Trả lời đây' })
  })

  it('a reply without thinking carries no trace block', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onDelta('Chỉ có chữ')
      h.onDone({ inputTokens: 2, outputTokens: 2 })
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'dễ thôi' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    expect(msgText(nova)).toBe('Chỉ có chữ')
    expect(nova.blocks.some((b) => b.type === 'trace')).toBe(false)
  })

  it('an error mid-thought keeps the partial trace above the error card', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onThinking?.('Đang cân nhắc…')
      h.onError('overloaded', 'busy', 529)
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'câu hỏi lỗi' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    const trace = nova.blocks.find((b) => b.type === 'trace')
    if (trace?.type !== 'trace') throw new Error('expected a trace block')
    expect(trace.steps[0]).toMatchObject({ kind: 'think', text: 'Đang cân nhắc…' })
    expect(result.current.s.respState).toBe('error')
  })
})
