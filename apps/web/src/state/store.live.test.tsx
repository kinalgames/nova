import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { msgText, renderStore } from '../test/util'
import { streamChat, type StreamHandlers } from '../services/llm'
import { rejectUpload, uploadFile } from '../services/upload'
import type { ChatProxyRequest } from '@nova/shared'

const calls: ChatProxyRequest[] = []

vi.mock('../services/llm', () => ({
  API_BASE: 'http://localhost:8787',
  HAS_API: true,
  streamChat: vi.fn(async (req: ChatProxyRequest, h: StreamHandlers) => {
    calls.push(req)
    h.onDelta('Xin ')
    h.onDelta('chào!')
    h.onDone({ inputTokens: 21, outputTokens: 7 })
  }),
}))

vi.mock('../services/upload', () => ({
  MAX_FILES: 4,
  rejectUpload: vi.fn(() => null),
  uploadFile: vi.fn(async (_f: File, onProgress: (pct: number) => void) => {
    onProgress(50)
    return { id: 'srv-1', name: 'a.png', kind: 'image', size: 3, mime: 'image/png' }
  }),
}))

beforeEach(() => {
  localStorage.clear()
  calls.length = 0
  vi.mocked(streamChat).mockClear()
  vi.mocked(rejectUpload).mockClear()
  vi.mocked(uploadFile).mockClear()
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
  // generous timeout: the file's FIRST test bears the whole import/transform
  // cost under coverage instrumentation on slow parallel runs
  it('a non-demo profile routes the send through the proxy with real usage', { timeout: 15_000 }, async () => {
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
    expect(calls[0].profile?.credential).toBe('sk-ant-real-123')
    expect(calls[0].messages.at(-1)).toEqual({ role: 'user', content: 'chào Nova' })
    expect(calls[0].model).toBe('claude-opus-4-8')
    // the persona rides along as a REAL system prompt on every live send
    expect(calls[0].system).toContain('You are Nova')
    expect(calls[0].system).toContain('concise')
    // B5 — the “Suy nghĩ” chip travels with the request
    expect(calls[0].thinking).toBe('normal')
  })

  it('D3 — the first completed reply names an unnamed conversation via the cheap sibling', async () => {
    const { result } = await renderStore({ path: '/new' })
    await act(async () =>
      result.current.v.providers
        .find((p) => p.id === 'claude')!
        .addProfile('api_key', 'Khóa thật', 'sk-ant-real-123'),
    )
    await act(async () => result.current.set({ draft: 'lên kế hoạch ra mắt sản phẩm' }))
    await act(async () => result.current.v.send())
    // a conversation is born unnamed — the reply call then the title call
    await waitFor(() => expect(result.current.s.conversations[0].title).toBe('Xin chào!'))
    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(2)
    expect(calls[1].model).toBe('claude-haiku-4-5')
    expect(calls[1].thinking).toBe('off')
    expect(calls[1].maxTokens).toBe(24)
    // the SECOND send in the now-named conversation stays a single call
    await act(async () => result.current.set({ draft: 'tiếp tục đi' }))
    await act(async () => result.current.v.send())
    expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(3)
  })

  it('B1 — a real upload lands a fileId and rides the send as an attachment ref', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    // real world: BE3 owns addProfile server-side — inject the profile directly
    await act(async () =>
      result.current.set((x) => ({
        profiles: {
          ...x.profiles,
          claude: [
            { id: 'p1', name: 'Khóa', kind: 'api_key', credential: 'sk-ant-real-123', status: 'active' },
          ],
        },
      })),
    )
    await act(async () =>
      result.current.addUpload(new File(['x'], 'chart.png', { type: 'image/png' })),
    )
    const staged = () => Object.values(result.current.s.staged).flat()
    await waitFor(() => expect(staged()[0]?.fileId).toBe('srv-1'))
    expect(staged()[0]?.progress).toBeUndefined()

    await act(async () => result.current.set({ draft: 'phân tích ảnh này' }))
    await act(async () => result.current.v.send())
    const turn = calls[0].messages.at(-1)!
    expect(turn.attachments).toEqual([{ id: 'srv-1' }])
    // the message block kept the display metadata AND the server id
    const files = result.current.v.sent
      .find((m) => m.role === 'user')!
      .blocks.find((b) => b.type === 'files')
    expect(files && files.type === 'files' && files.items[0].fileId).toBe('srv-1')
  })

  it('B1 — a rejected file becomes a danger pill, never uploads, never rides', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    vi.mocked(rejectUpload).mockReturnValueOnce('upload.tooLargeImage')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.set((x) => ({
        profiles: {
          ...x.profiles,
          claude: [
            { id: 'p1', name: 'Khóa', kind: 'api_key', credential: 'sk-ant-real-123', status: 'active' },
          ],
        },
      })),
    )
    await act(async () =>
      result.current.addUpload(new File(['x'.repeat(9)], 'big.png', { type: 'image/png' })),
    )
    const staged = () => Object.values(result.current.s.staged).flat()
    expect(staged()[0]?.error).toBeTruthy()
    expect(uploadFile).not.toHaveBeenCalled()

    await act(async () => result.current.set({ draft: 'gửi thử' }))
    await act(async () => result.current.v.send())
    const turn = calls[0].messages.at(-1)!
    expect(turn.attachments).toBeUndefined()
    expect(
      result.current.v.sent.find((m) => m.role === 'user')!.blocks.some((b) => b.type === 'files'),
    ).toBe(false)
  })

  it('B1 — a failed upload flips into an error pill and the 4-file cap toasts', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    vi.mocked(uploadFile).mockResolvedValueOnce(null)
    const { result } = await renderStore({ path: '/onboarding' })
    const staged = () => Object.values(result.current.s.staged).flat()
    await act(async () =>
      result.current.addUpload(new File(['x'], 'a.png', { type: 'image/png' })),
    )
    await waitFor(() => expect(staged()[0]?.error).toBeTruthy())

    for (let i = 0; i < 4; i++)
      await act(async () =>
        result.current.addUpload(new File(['x'], `f${i}.png`, { type: 'image/png' })),
      )
    expect(staged()).toHaveLength(4)
    expect(result.current.s.toast).toBe('Tối đa 4 tệp mỗi tin nhắn')
  })

  it('the thinking level follows the composer chip', async () => {
    const { result } = await withRealProfile()
    await act(async () => result.current.v.setThinkHigh())
    await act(async () => result.current.set({ draft: 'suy nghĩ sâu' }))
    await act(async () => result.current.v.send())
    expect(calls[0].thinking).toBe('high')
  })

  it('the system prompt reflects name, style toggles and custom instructions', async () => {
    const { result } = await withRealProfile()
    await act(async () =>
      result.current.set({
        assistantName: 'Bee',
        styles: { concise: false, warm: true, formal: false, humor: false },
        systemPrompt: 'Luôn xưng "em" với người dùng.',
      }),
    )
    await act(async () => result.current.set({ draft: 'chào' }))
    await act(async () => result.current.v.send())
    expect(calls[0].system).toContain('You are Bee')
    expect(calls[0].system).toContain('warm, friendly')
    expect(calls[0].system).not.toContain('concise')
    expect(calls[0].system).toContain('Luôn xưng "em" với người dùng.')
  })

  it('a non-claude provider routes live too — providerId follows the routed slot', async () => {
    const { result } = await renderStore()
    await act(async () =>
      result.current.v.providers
        .find((p) => p.id === 'gemini')!
        .addProfile('api_key', 'Khóa Gemini', 'AIza-real-1'),
    )
    await act(async () =>
      result.current.set({
        slots: {
          smart: { providerId: 'gemini', modelId: 'gemini-2.5-pro' },
          fast: { providerId: 'gemini', modelId: 'gemini-2.5-flash' },
        },
      }),
    )
    await act(async () => result.current.set({ draft: 'chào Gemini' }))
    await act(async () => result.current.v.send())

    expect(calls[0].providerId).toBe('gemini')
    expect(calls[0].model).toBe('gemini-2.5-pro')
    expect(calls[0].profile?.credential).toBe('AIza-real-1')
    expect(msgText(result.current.v.sent.at(-1))).toBe('Xin chào!')
    expect(result.current.v.sent.at(-1)?.usage).toMatchObject({ modelId: 'gemini-2.5-pro' })
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
    // the specific error drives the danger card, not buried bubble text
    expect(result.current.v.isError).toBe(true)
    expect(result.current.v.errorDetail).toContain('rate_limited')
    expect(result.current.v.errorAction).toBe('retry')
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
      h.onError('upstream_error', 'invalid x-api-key', 401, undefined, 'ray-9')
    })
    const { result } = await withRealProfile()
    await act(async () => result.current.set({ draft: 'key sai thử xem' }))
    await act(async () => result.current.v.send())
    expect(result.current.v.errorDetail).toBe('upstream_error: invalid x-api-key')
    // B4 — the correlation id lands beside the error for support reports
    expect(result.current.v.errorRequestId).toBe('ray-9')
    expect(result.current.v.isError).toBe(true)
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
    // partial answer is kept ABOVE the card; the error goes to the card
    expect(msgText(result.current.v.sent.at(-1))).toContain('một phần trả lời')
    expect(result.current.v.errorDetail).toContain('rate_limited')
    const prof = result.current.s.profiles.claude.find((f) => f.name === 'Khóa thật')!
    expect(prof.limitedUntil).toBeGreaterThanOrEqual(Date.now() + 55_000)
  })

  it('real mode with NO provider shows the error card, never silent nothing', async () => {
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.set({ draft: 'chào' }))
    await act(async () => result.current.v.send())
    // a persistent danger card, not a vanished toast
    expect(result.current.v.isError).toBe(true)
    expect(result.current.v.errorAction).toBe('providers')
    expect(result.current.v.errorDetail).toBeTruthy()
    // an assistant bubble exists to carry the card, and no real call went out
    expect(result.current.v.sent.at(-1)?.role).toBe('assistant')
    expect(vi.mocked(streamChat)).not.toHaveBeenCalled()
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
