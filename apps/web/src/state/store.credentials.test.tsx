import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, configure, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'

// the async credential hydrate resolves a microtask after mount; give waitFor
// headroom so this file stays green under the parallel projects run
configure({ asyncUtilTimeout: 5000 })
import { PERSIST_KEY } from './persist'
import {
  addCredential,
  exchangeGeminiCode,
  listCredentials,
  pingCredential,
  startGeminiOAuth,
  type ServerCredential,
} from '../services/credentials'
import { streamChat } from '../services/llm'

vi.mock('../services/credentials', async (importOriginal) => ({
  // extractOAuthCode is pure — fall through to the real implementation
  // (already unit-tested directly); only the network-calling functions
  // below are given deterministic test doubles
  ...(await importOriginal<typeof import('../services/credentials')>()),
  listCredentials: vi.fn(async () => [] as ServerCredential[]),
  addCredential: vi.fn(async () => null),
  patchCredential: vi.fn(async () => true),
  deleteCredential: vi.fn(async () => true),
  pingCredential: vi.fn(async () => 'active' as const),
  startGeminiOAuth: vi.fn(async () => 'https://accounts.google.com/o/oauth2/v2/auth'),
  exchangeGeminiCode: vi.fn(async () => ({ ok: true, refreshToken: '1//abc' })),
}))

vi.mock('../services/llm', () => ({
  API_BASE: 'http://localhost:8787',
  HAS_API: true,
  streamChat: vi.fn(
    async (_req: unknown, h: { onDelta: (t: string) => void; onDone: (u: unknown) => void }) => {
      h.onDelta('ok')
      h.onDone({ inputTokens: 1, outputTokens: 1 })
    },
  ),
}))

vi.mock('../services/sync', () => ({
  pullOps: vi.fn(async () => ({ seq: 0, ops: [] })),
  pushOps: vi.fn(async () => 1),
  startLiveSync: vi.fn(() => () => {}),
  SYNC_SRC: 'test-src',
}))

const row = (over: Partial<ServerCredential> = {}): ServerCredential => ({
  id: 'srv-1',
  providerId: 'claude',
  kind: 'api_key',
  name: 'Chính',
  hint: '…4321',
  status: 'active',
  priority: 0,
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('nova.auth.token', 'tok')
  vi.mocked(listCredentials).mockClear()
  vi.mocked(listCredentials).mockResolvedValue([])
  vi.mocked(addCredential).mockClear()
  vi.mocked(streamChat as Mock).mockClear()
  vi.mocked(startGeminiOAuth).mockClear()
  vi.mocked(exchangeGeminiCode).mockClear()
})

describe('store — server-side BYOK wiring (BE3)', () => {
  it('boot hydrates profiles from the server list — hints only, never secrets', async () => {
    vi.mocked(listCredentials).mockResolvedValue([row()])
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() => expect(result.current.s.profiles.claude).toHaveLength(1))
    expect(result.current.s.profiles.claude[0]).toMatchObject({
      id: 'srv-1',
      credential: '…4321',
      server: true,
      status: 'active',
    })
  })

  it('an empty server migrates client-held real profiles up once', async () => {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        profiles: {
          claude: [{ id: 'loc', name: 'Cũ', kind: 'api_key', credential: 'sk-ant-x', status: 'active' }],
          gemini: [],
          openai: [],
          ollama: [],
        },
      }),
    )
    vi.mocked(listCredentials)
      .mockResolvedValueOnce([])
      .mockResolvedValue([row({ id: 'srv-mig', hint: '…nt-x' })])
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() =>
      expect(addCredential).toHaveBeenCalledWith('claude', 'api_key', 'Cũ', 'sk-ant-x'),
    )
    await waitFor(() =>
      expect(result.current.s.profiles.claude[0]).toMatchObject({ id: 'srv-mig', server: true }),
    )
  })

  it('adding a profile in real mode seals it server-side and keeps the hint', async () => {
    vi.mocked(addCredential).mockResolvedValueOnce(
      row({ id: 'srv-new', hint: '…9999', status: 'untested' }),
    )
    const { result } = await renderStore({ world: 'real' })
    const claude = result.current.v.providers.find((p) => p.id === 'claude')!
    await act(async () => claude.addProfile('api_key', 'Mới', 'sk-ant-9999'))
    await waitFor(() =>
      expect(result.current.s.profiles.claude.find((f) => f.id === 'srv-new')?.credential).toBe(
        '…9999',
      ),
    )
    expect(addCredential).toHaveBeenCalledWith('claude', 'api_key', 'Mới', 'sk-ant-9999')
  })

  it('a real send chats by credentialId — no secret travels in the request', async () => {
    vi.mocked(listCredentials).mockResolvedValue([row()])
    const { result } = await renderStore({ world: 'real', path: '/new' })
    await waitFor(() => expect(result.current.s.profiles.claude).toHaveLength(1))
    await act(async () => result.current.set({ draft: 'xin chào server' }))
    await act(async () => result.current.v.send())
    await waitFor(() => expect(streamChat).toHaveBeenCalled())
    const req = (streamChat as Mock).mock.calls[0][0] as {
      credentialId?: string
      profile?: unknown
    }
    expect(req.credentialId).toBe('srv-1')
    expect(req.profile).toBeUndefined()
  })

  it('testing a server credential runs a REAL probe, stores the verdict AND the reason', async () => {
    vi.mocked(listCredentials).mockResolvedValue([row({ status: 'untested' })])
    vi.mocked(pingCredential).mockResolvedValueOnce({
      status: 'limited',
      detail: 'quota exceeded, retry later',
      code: 'rate_limited',
      httpStatus: 429,
    })
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() => expect(result.current.s.profiles.claude).toHaveLength(1))
    const claude = result.current.v.providers.find((p) => p.id === 'claude')!
    await act(async () => claude.profiles[0].test())
    await waitFor(() =>
      expect(result.current.s.profiles.claude[0].status).toBe('limited'),
    )
    expect(pingCredential).toHaveBeenCalledWith('srv-1', 'claude', 'claude-haiku-4-5')
    // the WHY surfaces under the row IN PLAIN WORDS — never a mute failure
    const refreshed = result.current.v.providers.find((p) => p.id === 'claude')!
    expect(refreshed.profiles[0].error).toContain('Chạm giới hạn tốc độ')
    expect(refreshed.profiles[0].error).toContain('quota exceeded')
  })
})

describe('store — Gemini OAuth popup (replaces the manual paste for account kind)', () => {
  it('startGeminiLogin surfaces a plain-words error when the start route fails', async () => {
    vi.mocked(startGeminiOAuth).mockResolvedValueOnce(null)
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.startGeminiLogin())
    await waitFor(() =>
      expect(result.current.s.geminiOAuth).toEqual({
        status: 'idle',
        error: 'Không mở được trang đăng nhập Google — thử lại.',
      }),
    )
  })

  it('startGeminiLogin opens the Google popup and marks the flow ready', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.startGeminiLogin())
    await waitFor(() => expect(result.current.s.geminiOAuth).toEqual({ status: 'ready', error: null }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth',
      'nova-gemini-oauth',
      'width=480,height=640',
    )
    openSpy.mockRestore()
  })

  it('submitGeminiCode rejects a paste with no code and never starts an exchange', async () => {
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.submitGeminiCode('not a url', 'Tài khoản Google'))
    expect(result.current.s.geminiOAuth).toEqual({
      status: 'idle',
      error:
        'Không tìm thấy mã trong nội dung đã dán — hãy sao chép toàn bộ địa chỉ sau khi đăng nhập.',
    })
    expect(exchangeGeminiCode).not.toHaveBeenCalled()
  })

  it('submitGeminiCode exchanges the pasted code, seals a Gemini profile and closes the popup', async () => {
    const popup = { close: vi.fn() } as unknown as Window
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup)
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.startGeminiLogin())
    await waitFor(() => expect(result.current.s.geminiOAuth.status).toBe('ready'))
    await act(async () =>
      result.current.v.submitGeminiCode(
        'http://localhost:58219/oauth2callback?state=x&code=4%2F0Ab_realcode&scope=email',
        'Tài khoản Google',
      ),
    )
    await waitFor(() =>
      expect(addCredential).toHaveBeenCalledWith('gemini', 'account', 'Tài khoản Google', '1//abc'),
    )
    await waitFor(() =>
      expect(result.current.s.geminiOAuth).toEqual({ status: 'idle', error: null }),
    )
    expect(popup.close).toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('submitGeminiCode surfaces an exchange failure in plain words and keeps the popup open', async () => {
    const popup = { close: vi.fn() } as unknown as Window
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup)
    vi.mocked(exchangeGeminiCode).mockResolvedValueOnce({
      ok: false,
      code: 'oauth_exchange_failed',
      detail: 'invalid_grant',
    })
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.startGeminiLogin())
    await waitFor(() => expect(result.current.s.geminiOAuth.status).toBe('ready'))
    await act(async () =>
      result.current.v.submitGeminiCode(
        'http://localhost:58219/oauth2callback?code=bad-code',
        'Tài khoản Google',
      ),
    )
    await waitFor(() =>
      expect(result.current.s.geminiOAuth).toEqual({
        status: 'ready',
        error: 'Có lỗi xảy ra khi kết nối · oauth_exchange_failed: invalid_grant',
      }),
    )
    expect(addCredential).not.toHaveBeenCalled()
    expect(popup.close).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('cancelGeminiOAuth closes the popup and resets to idle without touching credentials', async () => {
    const popup = { close: vi.fn() } as unknown as Window
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup)
    const { result } = await renderStore({ world: 'real' })
    await act(async () => result.current.v.startGeminiLogin())
    await waitFor(() => expect(result.current.s.geminiOAuth.status).toBe('ready'))
    act(() => result.current.v.cancelGeminiOAuth())
    expect(result.current.s.geminiOAuth).toEqual({ status: 'idle', error: null })
    expect(popup.close).toHaveBeenCalled()
    expect(exchangeGeminiCode).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })
})
