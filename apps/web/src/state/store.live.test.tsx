import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { msgText, renderStore } from '../test/util'
import { streamChat, type StreamHandlers } from '../services/llm'
import { deleteFile, rejectUpload, uploadFile } from '../services/upload'
import { createShare, revokeShare } from '../services/share'
import { fromLinear } from './thread'
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

vi.mock('../services/share', () => ({
  createShare: vi.fn(async () => 'sh-1'),
  revokeShare: vi.fn(async () => true),
}))

vi.mock('../services/upload', () => ({
  MAX_FILES: 4,
  deleteFile: vi.fn(async () => true),
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
  vi.mocked(deleteFile).mockClear()
  vi.mocked(createShare).mockClear()
  vi.mocked(revokeShare).mockClear()
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
    expect(calls[1].maxTokens).toBe(64)
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

  it('B1 — deleting a conversation deletes its server attachments and its tray', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.set((x) => ({
        conversations: [{ id: 'cx', title: 'X', projectId: 'chung' }, ...x.conversations],
        threads: {
          ...x.threads,
          cx: fromLinear([
            {
              id: 'm1',
              role: 'user',
              who: 'B',
              blocks: [
                { type: 'text', text: 'hi' },
                { type: 'files', items: [{ kind: 'image', name: 'a.png', fileId: 'srv-7' }] },
              ],
            },
          ]),
        },
        staged: {
          ...x.staged,
          cx: [{ id: 's1', kind: 'pdf', name: 'p.pdf', size: '1 KB', fileId: 'srv-8' }],
        },
      })),
    )
    vi.useFakeTimers()
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'cx')!.del())
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(deleteFile).toHaveBeenCalledWith('srv-7')
    // uploaded-but-never-sent tray files die with the conversation too
    expect(deleteFile).toHaveBeenCalledWith('srv-8')
    expect(result.current.s.threads.cx).toBeUndefined()
    expect(result.current.s.staged.cx).toBeUndefined()
    expect(result.current.s.conversations.some((c) => c.id === 'cx')).toBe(false)
  })

  it('demo world: deleting a conversation clears its error card, revokes object\n     URLs and never calls the server', async () => {
    const { result } = await renderStore()
    URL.revokeObjectURL = vi.fn()
    await act(async () =>
      result.current.set((x) => ({
        threads: {
          ...x.threads,
          c2: fromLinear([
            {
              id: 'm1',
              role: 'user',
              who: 'B',
              blocks: [
                {
                  type: 'files',
                  items: [{ kind: 'image', name: 'a.png', fileId: 'srv-x', url: 'blob:z' }],
                },
              ],
            },
          ]),
        },
        errorConv: 'c2',
        errorDetail: 'x',
        errorAction: 'retry' as const,
      })),
    )
    vi.useFakeTimers()
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c2')!.del())
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(deleteFile).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:z')
    expect(result.current.s.errorConv).toBeNull()
    expect(result.current.s.errorDetail).toBeNull()
  })

  it('BE4 — share freezes a snapshot, re-copy reuses it, unshare kills it', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.set((x) => ({
        conversations: [{ id: 'cs', title: 'Kế hoạch', projectId: 'chung' }, ...x.conversations],
        threads: {
          ...x.threads,
          cs: fromLinear([
            { id: 'm1', role: 'user', who: 'B', blocks: [{ type: 'text', text: 'xin chào' }] },
            { id: 'm2', role: 'assistant', who: 'NOVA', blocks: [{ type: 'text', text: 'chào bạn' }] },
          ]),
        },
      })),
    )
    const conv = () => result.current.v.sideConvs.find((c) => c.id === 'cs')!
    await act(async () => conv().share())
    expect(createShare).toHaveBeenCalledTimes(1)
    expect((createShare as Mock).mock.calls[0][2]).toHaveLength(2)
    expect(result.current.s.conversations.find((c) => c.id === 'cs')?.shareId).toBe('sh-1')

    // second share = same link, no new snapshot
    await act(async () => conv().share())
    expect(createShare).toHaveBeenCalledTimes(1)

    await act(async () => conv().unshare())
    expect(revokeShare).toHaveBeenCalledWith('sh-1')
    expect(result.current.s.conversations.find((c) => c.id === 'cs')?.shareId).toBeUndefined()
  })

  it('BE4 — share failure paths toast and never corrupt state; demo copies only', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.set((x) => ({
        conversations: [{ id: 'ce', title: null, projectId: 'chung' }, ...x.conversations],
      })),
    )
    const conv = () => result.current.v.sideConvs.find((c) => c.id === 'ce')!
    // unshare on a never-shared conversation is a silent no-op
    await act(async () => conv().unshare())
    expect(revokeShare).not.toHaveBeenCalled()
    // nothing to share yet
    await act(async () => conv().share())
    expect(result.current.s.toast).toBe('Chưa có nội dung để chia sẻ')
    expect(createShare).not.toHaveBeenCalled()
    // server refuses → failed toast, no shareId
    await act(async () =>
      result.current.set((x) => ({
        threads: {
          ...x.threads,
          ce: fromLinear([
            { id: 'm1', role: 'user', who: 'B', blocks: [{ type: 'text', text: 'hi' }] },
          ]),
        },
      })),
    )
    vi.mocked(createShare).mockResolvedValueOnce(null)
    await act(async () => conv().share())
    expect(result.current.s.toast).toBe('Tạo liên kết thất bại — thử lại sau')
    expect(result.current.s.conversations.find((c) => c.id === 'ce')?.shareId).toBeUndefined()
    // revoke failure keeps the shareId (the link is still live)
    await act(async () =>
      result.current.set((x) => ({
        conversations: x.conversations.map((k) => (k.id === 'ce' ? { ...k, shareId: 'sh-e' } : k)),
      })),
    )
    vi.mocked(revokeShare).mockResolvedValueOnce(false)
    await act(async () => conv().unshare())
    expect(result.current.s.conversations.find((c) => c.id === 'ce')?.shareId).toBe('sh-e')

    // demo world: the showcase copy path never touches the server
    const demo = await renderStore()
    await act(async () => demo.result.current.v.sideConvs[0].share())
    expect(demo.result.current.s.toast).toBe('Đã chép liên kết chia sẻ')
    expect(createShare).toHaveBeenCalledTimes(1) // only the failed attempt above
  })

  it('BE4 — deleting a shared conversation revokes its live share', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.set((x) => ({
        conversations: [
          { id: 'cs2', title: 'X', projectId: 'chung', shareId: 'sh-9' },
          ...x.conversations,
        ],
      })),
    )
    vi.useFakeTimers()
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'cs2')!.del())
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(revokeShare).toHaveBeenCalledWith('sh-9')
  })

  it('demo world: deleteAccount is a hard no-op', async () => {
    const { result } = await renderStore()
    let ok = true
    await act(async () => {
      ok = await result.current.v.deleteAccount()
    })
    expect(ok).toBe(false)
  })

  it('BUG-1 — a removed tray pill deletes its uploaded file server-side', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.addUpload(new File(['x'], 'a.png', { type: 'image/png' })),
    )
    const staged = () => Object.values(result.current.s.staged).flat()
    await waitFor(() => expect(staged()[0]?.fileId).toBe('srv-1'))
    await act(async () => result.current.v.removeStaged(staged()[0].id))
    expect(deleteFile).toHaveBeenCalledWith('srv-1')
    expect(staged()).toHaveLength(0)
  })

  it('BUG-1 — an upload finishing after its pill was removed deletes itself', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    let resolveUp!: (v: { id: string; name: string; kind: string; size: number; mime: string } | null) => void
    vi.mocked(uploadFile).mockImplementationOnce(
      () => new Promise((r) => (resolveUp = r)),
    )
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.addUpload(new File(['x'], 'b.png', { type: 'image/png' })),
    )
    const staged = () => Object.values(result.current.s.staged).flat()
    await act(async () => result.current.v.removeStaged(staged()[0].id))
    await act(async () => {
      resolveUp({ id: 'late-9', name: 'b.png', kind: 'image', size: 1, mime: 'image/png' })
    })
    expect(deleteFile).toHaveBeenCalledWith('late-9')
    expect(staged()).toHaveLength(0)
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
    // the specific error drives the danger card, not buried bubble text —
    // humanized: the rate-limit class shows its own sentence, not raw code
    expect(result.current.v.isError).toBe(true)
    expect(result.current.v.errorDetail).toContain('giới hạn tốc độ')
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
    // a configured profile means no BYOK nudge on the chat surface
    expect(result.current.v.needsProvider).toBe(false)
    // humanized: a rejected key explains itself and keeps the provider text
    expect(result.current.v.errorDetail).toContain('Khóa API')
    expect(result.current.v.errorDetail).toContain('invalid x-api-key')
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
    expect(result.current.v.errorDetail).toContain('giới hạn tốc độ')
    const prof = result.current.s.profiles.claude.find((f) => f.name === 'Khóa thật')!
    expect(prof.limitedUntil).toBeGreaterThanOrEqual(Date.now() + 55_000)
  })

  it('real mode with NO provider shows the error card, never silent nothing', async () => {
    const { result } = await renderStore({ world: 'real' })
    // no live profile for the active model → the BYOK nudge shows on chat
    expect(result.current.v.needsProvider).toBe(true)
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
