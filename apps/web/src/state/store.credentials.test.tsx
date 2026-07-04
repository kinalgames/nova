import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, configure, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'

// the async credential hydrate resolves a microtask after mount; give waitFor
// headroom so this file stays green under the parallel projects run
configure({ asyncUtilTimeout: 5000 })
import { PERSIST_KEY } from './persist'
import {
  addCredential,
  listCredentials,
  pingCredential,
  type ServerCredential,
} from '../services/credentials'
import { streamChat } from '../services/llm'

vi.mock('../services/credentials', () => ({
  listCredentials: vi.fn(async () => [] as ServerCredential[]),
  addCredential: vi.fn(async () => null),
  patchCredential: vi.fn(async () => true),
  deleteCredential: vi.fn(async () => true),
  pingCredential: vi.fn(async () => 'active' as const),
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
    vi.mocked(pingCredential).mockResolvedValueOnce({ status: 'limited', detail: 'rate_limited: quota' })
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() => expect(result.current.s.profiles.claude).toHaveLength(1))
    const claude = result.current.v.providers.find((p) => p.id === 'claude')!
    await act(async () => claude.profiles[0].test())
    await waitFor(() =>
      expect(result.current.s.profiles.claude[0].status).toBe('limited'),
    )
    expect(pingCredential).toHaveBeenCalledWith('srv-1', 'claude', 'claude-haiku-4-5')
    // the WHY surfaces under the row — never a mute failure
    const refreshed = result.current.v.providers.find((p) => p.id === 'claude')!
    expect(refreshed.profiles[0].error).toBe('rate_limited: quota')
  })
})
