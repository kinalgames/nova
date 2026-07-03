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

describe('startLiveSync — environment guard', () => {
  it('returns an inert stop() outside a real browser', async () => {
    const { startLiveSync } = await import('./sync')
    const stop = startLiveSync({ onFrame: () => {} })
    expect(typeof stop).toBe('function')
    stop() // must not throw
  })
})

describe('startLiveSync — socket lifecycle (stubbed WebSocket)', () => {
  it('connects with the bearer subprotocol, forwards frames, reconnects, stops', async () => {
    vi.useFakeTimers()
    localStorage.setItem('nova.auth.token', 'tok-live')
    const sockets: FakeWS[] = []
    class FakeWS {
      onopen: (() => void) | null = null
      onmessage: ((e: { data: string }) => void) | null = null
      onclose: (() => void) | null = null
      onerror: (() => void) | null = null
      closed = false
      constructor(
        public url: string,
        public protos: string[],
      ) {
        sockets.push(this)
      }
      close() {
        if (this.closed) return
        this.closed = true
        this.onclose?.()
      }
    }
    vi.stubGlobal('WebSocket', FakeWS)
    try {
      const { startLiveSync } = await import('./sync')
      const frames: unknown[] = []
      const stop = startLiveSync({ onFrame: (f) => frames.push(f) })
      expect(sockets).toHaveLength(1)
      expect(sockets[0].url).toContain('/v1/sync/ws')
      expect(sockets[0].protos).toEqual(['nova-sync', 'tok-live'])
      sockets[0].onopen?.()
      sockets[0].onmessage?.({ data: JSON.stringify({ type: 'hello', seq: 3 }) })
      expect(frames).toEqual([{ type: 'hello', seq: 3 }])
      sockets[0].onmessage?.({ data: 'junk{' }) // parse guard must swallow
      expect(frames).toHaveLength(1)
      // an error closes the socket → backoff reconnect opens a second one
      sockets[0].onerror?.()
      await vi.advanceTimersByTimeAsync(2500)
      expect(sockets.length).toBeGreaterThanOrEqual(2)
      stop() // closes the live socket and cancels timers — no throw
    } finally {
      vi.unstubAllGlobals()
      vi.useRealTimers()
      localStorage.removeItem('nova.auth.token')
    }
  })
})

describe('startLiveSync — token wait and visibility revive', () => {
  it('schedules until a token exists, then reconnects when the tab returns', async () => {
    vi.useFakeTimers()
    localStorage.removeItem('nova.auth.token')
    const sockets: unknown[] = []
    class FakeWS {
      onopen: (() => void) | null = null
      onmessage: ((e: { data: string }) => void) | null = null
      onclose: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        sockets.push(this)
      }
      close() {
        this.onclose?.()
      }
    }
    vi.stubGlobal('WebSocket', FakeWS)
    try {
      const { startLiveSync } = await import('./sync')
      const stop = startLiveSync({ onFrame: () => {} })
      // no token yet — nothing opened, a retry is scheduled instead
      expect(sockets).toHaveLength(0)
      localStorage.setItem('nova.auth.token', 'tok-later')
      await vi.advanceTimersByTimeAsync(1600)
      expect(sockets).toHaveLength(1)
      // socket dies; the tab coming back to the foreground reopens at once
      ;(sockets[0] as InstanceType<typeof FakeWS>).close()
      document.dispatchEvent(new Event('visibilitychange'))
      expect(sockets.length).toBeGreaterThanOrEqual(2)
      stop()
    } finally {
      vi.unstubAllGlobals()
      vi.useRealTimers()
      localStorage.removeItem('nova.auth.token')
    }
  })
})
