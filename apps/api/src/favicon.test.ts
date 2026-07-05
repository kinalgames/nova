import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { favicon } from './favicon'

// Cache API and a stub ExecutionContext — plain Node has neither; favicon.ts
// treats them as ambient Workers globals the way it would in production
const cacheStore = vi.hoisted(() => ({ match: vi.fn(), put: vi.fn() }))
const execCtx = { waitUntil: (p: Promise<unknown>) => void p } as unknown as ExecutionContext

beforeEach(() => {
  vi.stubGlobal('caches', { default: cacheStore })
  cacheStore.match.mockReset().mockResolvedValue(undefined)
  cacheStore.put.mockReset().mockResolvedValue(undefined)
})

afterEach(() => vi.unstubAllGlobals())

const get = (query: string) => favicon.request(`/${query}`, {}, {}, execCtx)

describe('citations/T8 — favicon proxy', () => {
  it('rejects anything that is not a bare hostname (400) — no upstream fetch happens', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const bad of ['', '?domain=', '?domain=http://a.vn', '?domain=/etc/passwd', '?domain=a..vn']) {
      const res = await get(bad)
      expect(res.status).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a cache miss fetches the upstream, streams it back, and writes the cache with a long TTL', async () => {
    const body = new Uint8Array([1, 2, 3])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64')
        return new Response(body, { status: 200, headers: { 'content-type': 'image/png' } })
      }),
    )
    const res = await get('?domain=example.com')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toContain('max-age=604800')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(body)
    expect(cacheStore.put).toHaveBeenCalledTimes(1)
  })

  it('a cache hit returns the cached response directly — no upstream fetch', async () => {
    const cached = new Response(new Uint8Array([9]), { status: 200 })
    cacheStore.match.mockResolvedValue(cached)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const res = await get('?domain=example.com')
    expect(res).toBe(cached)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a network failure degrades to the blank fallback icon — never a 5xx to the client', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const res = await get('?domain=example.com')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(cacheStore.put).not.toHaveBeenCalled()
  })

  it('an upstream non-OK response also degrades to the blank fallback, without caching it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    const res = await get('?domain=example.com')
    expect(res.status).toBe(200)
    expect(cacheStore.put).not.toHaveBeenCalled()
  })
})
