import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pullOps, pushOps } from './sync'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('sync transport', () => {
  it('pull returns the delta and sends the bearer', async () => {
    localStorage.setItem('nova.auth.token', 'tok')
    const fetchMock = vi.fn(async () => ok({ seq: 3, ops: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await pullOps(2)
    expect(res).toEqual({ seq: 3, ops: [] })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ]
    expect(url).toContain('/v1/sync?since=2')
    expect(init.headers.authorization).toBe('Bearer tok')
  })

  it('pull yields null on auth failure or network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 401 })))
    expect(await pullOps(0)).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await pullOps(0)).toBeNull()
  })

  it('push sends ops and returns the new head seq', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ seq: 9 })))
    expect(await pushOps([{ kind: 'del', table: 'thread', id: 'x', at: 1 }])).toBe(9)
  })

  it('push skips empty batches and absorbs failures', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await pushOps([])).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
    expect(await pushOps([{ kind: 'del', table: 'thread', id: 'x', at: 1 }])).toBeNull()
  })
})
