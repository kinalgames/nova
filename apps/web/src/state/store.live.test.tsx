import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act } from '@testing-library/react'
import { msgText, renderStore } from '../test/util'
import { streamChat, type StreamHandlers } from '../services/llm'
import type { ChatProxyRequest } from '@nova/shared'

const calls: ChatProxyRequest[] = []

vi.mock('../services/llm', () => ({
  API_BASE: 'http://localhost:8787',
  streamChat: vi.fn(async (req: ChatProxyRequest, h: StreamHandlers) => {
    calls.push(req)
    h.onDelta('Xin ')
    h.onDelta('chào!')
    h.onDone({ inputTokens: 21, outputTokens: 7 })
  }),
}))

beforeEach(() => {
  localStorage.clear()
  calls.length = 0
  vi.mocked(streamChat).mockClear()
})
afterEach(() => vi.useRealTimers())

async function withRealProfile() {
  const handle = await renderStore()
  await act(async () =>
    handle.result.current.v.providers
      .find((p) => p.id === 'claude')!
      .addProfile('api_key', 'Khóa thật', 'sk-ant-real-123'),
  )
  return handle
}

describe('real provider routing (nova-api proxy)', () => {
  it('a non-demo profile routes the send through the proxy with real usage', async () => {
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'chào Nova' }))
    await act(async () => result.current.v.send())

    const nova = result.current.v.sent.at(-1)!
    expect(nova.role).toBe('assistant')
    expect(msgText(nova)).toBe('Xin chào!')
    expect(nova.usage).toMatchObject({
      inputTokens: 21,
      outputTokens: 7,
      modelId: 'claude-opus-4-8',
    })
    expect(result.current.s.typing).toBe(false)

    // the request carried the REAL credential (never a seeded demo one) and
    // the visible history ending in the prompt
    expect(calls[0].profile.credential).toBe('sk-ant-real-123')
    expect(calls[0].messages.at(-1)).toEqual({ role: 'user', content: 'chào Nova' })
    expect(calls[0].model).toBe('claude-opus-4-8')
  })

  it('a 429 puts the profile into its cool-down window and surfaces the error', async () => {
    ;(streamChat as Mock).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onError('rate_limited', 'Too many requests', 429, 30)
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'quá tải thử xem' }))
    await act(async () => result.current.v.send())

    const prof = result.current.s.profiles.claude.find((f) => f.name === 'Khóa thật')!
    expect(prof.status).toBe('limited')
    expect(prof.limitedUntil).toBeGreaterThan(Date.now())
    expect(msgText(result.current.v.sent.at(-1))).toContain('⚠ rate_limited')
    expect(result.current.s.typing).toBe(false)
  })

  it('regenerate reuses the real path with the existing history', async () => {
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'câu đầu tiên' }))
    await act(async () => result.current.v.send())
    const firstReply = result.current.v.sent.at(-1)!
    await act(async () => result.current.v.regenerate(firstReply.id))
    // sibling version streamed through the proxy — 2 calls total
    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(2)
    const second = calls[1]
    // history ends at the ORIGINAL prompt (parent already flushed this time)
    expect(second.messages.at(-1)).toEqual({ role: 'user', content: 'câu đầu tiên' })
    expect(result.current.v.versions[result.current.v.sent.at(-1)!.id]?.count).toBe(2)
  })

  it('a non-429 provider error lands in the bubble without a cool-down', async () => {
    ;(streamChat as Mock).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onError('upstream_error', 'invalid x-api-key', 401)
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'key sai thử xem' }))
    await act(async () => result.current.v.send())
    expect(msgText(result.current.v.sent.at(-1))).toContain('⚠ upstream_error: invalid x-api-key')
    const prof = result.current.s.profiles.claude.find((f) => f.name === 'Khóa thật')!
    expect(prof.status).not.toBe('limited')
  })

  it('an error after partial output keeps the partial text and defaults the cool-down', async () => {
    ;(streamChat as Mock).mockImplementationOnce(async (_req: ChatProxyRequest, h: StreamHandlers) => {
      h.onDelta('một phần trả lời')
      h.onError('rate_limited', 'burst limit', 429) // no retry-after → 60s default
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'đứt giữa chừng' }))
    await act(async () => result.current.v.send())
    const text = msgText(result.current.v.sent.at(-1))
    expect(text).toContain('một phần trả lời')
    expect(text).toContain('⚠ rate_limited')
    const prof = result.current.s.profiles.claude.find((f) => f.name === 'Khóa thật')!
    expect(prof.limitedUntil).toBeGreaterThanOrEqual(Date.now() + 55_000)
  })

  it('demo-only profiles never leave the device — the fake layer answers', async () => {
    vi.useFakeTimers()
    const { result } = await renderStore()
    await act(async () => result.current.set({ draft: 'xin chào demo' }))
    await act(async () => result.current.v.send())
    await act(async () => vi.advanceTimersByTime(9000))
    expect(streamChat).not.toHaveBeenCalled()
    expect(result.current.v.sent.at(-1)?.role).toBe('assistant')
    expect(msgText(result.current.v.sent.at(-1)).length).toBeGreaterThan(0)
  })
})
