import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listOllamaModels, pullOllamaModel, type PullHandlers } from './ollama'
import type { AuthProfile } from '../state/types'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

const localProfile: AuthProfile = {
  id: 'po',
  name: 'Máy này',
  kind: 'api_key',
  credential: 'http://localhost:11434',
  status: 'active',
}
const serverProfile: AuthProfile = { ...localProfile, id: 'srv-9', server: true }

const sse = (frames: unknown[]) =>
  new Response(frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join(''), { status: 200 })

describe('ollama service — list', () => {
  it('POSTs the inline endpoint for a local profile and returns the rows', async () => {
    localStorage.setItem('nova.auth.token', 'tok-o')
    const fetchMock = vi.fn(async () =>
      Response.json({ models: [{ id: 'a', name: 'a', mode: 'fast', caps: {}, ctx: 0, inPrice: 0, outPrice: 0, size: '1 GB' }] }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const rows = await listOllamaModels(localProfile)
    expect(rows).toHaveLength(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/ollama/models')
    expect(JSON.parse(String(init.body))).toEqual({ endpoint: 'http://localhost:11434' })
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-o')
  })

  it('a sealed server profile rides by credentialId — the secret stays server-side', async () => {
    const fetchMock = vi.fn(async () => Response.json({ models: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await listOllamaModels(serverProfile)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ credentialId: 'srv-9' })
  })

  it('a refused or unreachable proxy returns null, never throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 502 })))
    expect(await listOllamaModels(localProfile)).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    expect(await listOllamaModels(localProfile)).toBeNull()
  })
})

function record() {
  const seen: { pct: (number | null)[]; status: string[]; done: boolean; errors: string[] } = {
    pct: [],
    status: [],
    done: false,
    errors: [],
  }
  const h: PullHandlers = {
    onProgress: (pct, status) => {
      seen.pct.push(pct)
      seen.status.push(status)
    },
    onDone: () => {
      seen.done = true
    },
    onError: (m) => {
      seen.errors.push(m)
    },
  }
  return { seen, h }
}

describe('ollama service — pull', () => {
  it('streams progress percentages and finishes on done:true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sse([
          { status: 'pulling manifest' },
          { status: 'downloading', total: 200, completed: 50 },
          { status: 'downloading', total: 200, completed: 200 },
          { done: true },
        ]),
      ),
    )
    const { seen, h } = record()
    await pullOllamaModel(localProfile, 'llama3.2', h)
    expect(seen.pct).toEqual([null, 25, 100])
    expect(seen.status[1]).toBe('downloading')
    expect(seen.done).toBe(true)
    expect(seen.errors).toEqual([])
  })

  it('an upstream error frame surfaces through onError and stops', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([{ error: 'file does not exist' }])))
    const { seen, h } = record()
    await pullOllamaModel(localProfile, 'nope', h)
    expect(seen.errors).toEqual(['file does not exist'])
    expect(seen.done).toBe(false)
  })

  it('a non-OK response reports the status; a network failure reports network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 401 })))
    const a = record()
    await pullOllamaModel(localProfile, 'm', a.h)
    expect(a.seen.errors[0]).toContain('401')

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    const b = record()
    await pullOllamaModel(localProfile, 'm', b.h)
    expect(b.seen.errors).toEqual(['network'])
  })

  it('a stream that closes without done still completes (onDone)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([{ status: 'writing manifest' }])))
    const { seen, h } = record()
    await pullOllamaModel(localProfile, 'm', h)
    expect(seen.done).toBe(true)
  })
})
