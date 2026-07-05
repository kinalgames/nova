import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'
import { listOllamaModels, pullOllamaModel, type PullHandlers } from '../services/ollama'
import type { AuthProfile } from './types'

// the proxy transport is mocked — the store logic (hydrate on profile,
// pull lifecycle, refresh after pull) is what this file locks
vi.mock('../services/ollama', () => ({
  listOllamaModels: vi.fn(async () => [
    { id: 'ornith:35b', name: 'ornith:35b', mode: 'fast', caps: { reasoning: true }, ctx: 262_144, inPrice: 0, outPrice: 0, size: '19.7 GB' },
  ]),
  pullOllamaModel: vi.fn(async (_p: AuthProfile, _m: string, h: PullHandlers) => {
    h.onProgress(40, 'downloading')
    h.onProgress(100, 'verifying')
    h.onDone()
  }),
}))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(listOllamaModels).mockClear()
  vi.mocked(pullOllamaModel).mockClear()
})

const withOllamaProfile = {
  profiles: {
    claude: [],
    gemini: [],
    openai: [],
    ollama: [
      { id: 'po', name: 'Máy này', kind: 'api_key' as const, credential: 'http://localhost:11434', status: 'active' as const },
    ],
  },
}

describe('store — dynamic ollama catalog (B6c)', () => {
  it('an ollama profile hydrates the catalog from the endpoint', async () => {
    const { result } = await renderStore({ storeInit: withOllamaProfile })
    await waitFor(() => expect(result.current.s.ollamaModels).toHaveLength(1))
    expect(listOllamaModels).toHaveBeenCalled()
    // the hydrated model reaches the slot pickers with its size badge
    expect(result.current.v.ollamaCatalog.models[0]).toMatchObject({
      id: 'ornith:35b',
      size: '19.7 GB',
    })
    expect(result.current.v.smartChoices.some((c) => c.key === 'ollama:ornith:35b')).toBe(true)
  })

  it('no ollama profile → no endpoint call, empty catalog', async () => {
    const { result } = await renderStore()
    // fixture has an ollama profile — strip it for this case
    expect(result.current.s.profiles.ollama.length).toBeGreaterThan(0)
    const { result: bare } = await renderStore({
      storeInit: { profiles: { claude: [], gemini: [], openai: [], ollama: [] } },
    })
    expect(bare.current.s.ollamaModels).toHaveLength(0)
  })

  it('pull streams progress, toasts on done and refreshes the catalog', async () => {
    const { result } = await renderStore({ storeInit: withOllamaProfile })
    await waitFor(() => expect(result.current.s.ollamaModels).toHaveLength(1))
    vi.mocked(listOllamaModels).mockClear()
    await act(async () => result.current.v.ollamaCatalog.pull('llama3.2'))
    // lifecycle finished: progress cleared, success toast, catalog re-asked
    // (ollamaPull clear + toast set land in the same onDone tick, but under
    // coverage instrumentation the two set() calls can surface across two
    // separate render passes — wait for the toast itself too, not just pull)
    await waitFor(() => expect(result.current.s.ollamaPull).toBeNull())
    await waitFor(() => expect(result.current.s.toast).toContain('llama3.2'))
    expect(listOllamaModels).toHaveBeenCalledTimes(1)
    expect(pullOllamaModel).toHaveBeenCalledWith(
      expect.objectContaining({ credential: 'http://localhost:11434' }),
      'llama3.2',
      expect.anything(),
    )
  })

  it('a failed pull clears the progress line and toasts the reason', async () => {
    vi.mocked(pullOllamaModel).mockImplementationOnce(async (_p, _m, h) => {
      h.onProgress(10, 'downloading')
      h.onError('file does not exist')
    })
    const { result } = await renderStore({ storeInit: withOllamaProfile })
    await act(async () => result.current.v.ollamaCatalog.pull('khong-ton-tai'))
    await waitFor(() => expect(result.current.s.ollamaPull).toBeNull())
    expect(result.current.s.toast).toContain('file does not exist')
  })

  it('refresh without an ollama profile is a safe no-op', async () => {
    const { result } = await renderStore({
      storeInit: { profiles: { claude: [], gemini: [], openai: [], ollama: [] } },
    })
    await act(async () => result.current.v.ollamaCatalog.refresh())
    expect(listOllamaModels).not.toHaveBeenCalled()
  })

  it('an unreachable endpoint keeps the previous catalog (refresh returns null)', async () => {
    const { result } = await renderStore({ storeInit: withOllamaProfile })
    await waitFor(() => expect(result.current.s.ollamaModels).toHaveLength(1))
    vi.mocked(listOllamaModels).mockResolvedValueOnce(null)
    await act(async () => result.current.v.ollamaCatalog.refresh())
    // null → nothing overwritten — the stale-but-usable catalog survives
    expect(result.current.s.ollamaModels).toHaveLength(1)
  })

  it('an empty name or an in-flight pull is a no-op', async () => {
    const { result } = await renderStore({ storeInit: withOllamaProfile })
    await act(async () => result.current.v.ollamaCatalog.pull('   '))
    expect(pullOllamaModel).not.toHaveBeenCalled()
    // one download at a time — a second request while pulling is refused
    await act(async () =>
      result.current.set({ ollamaPull: { model: 'llama3.2', pct: 10, status: 'downloading' } }),
    )
    await act(async () => result.current.v.ollamaCatalog.pull('qwen3'))
    expect(pullOllamaModel).not.toHaveBeenCalled()
  })
})
