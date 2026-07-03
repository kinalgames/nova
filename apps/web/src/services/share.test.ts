import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createShare, fetchShare, revokeShare, shareFileUrl } from './share'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

describe('BE4 — share service', () => {
  it('createShare posts the snapshot with the bearer and returns the id', async () => {
    localStorage.setItem('nova.auth.token', 'tok-s')
    const fetchMock = vi.fn(async () => json({ id: 'sh-42' }))
    vi.stubGlobal('fetch', fetchMock)
    const id = await createShare('c1', 'Kế hoạch', [
      { role: 'user', who: 'B', text: 'xin chào' },
    ])
    expect(id).toBe('sh-42')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/shares')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-s')
    expect(JSON.parse(init.body as string).convId).toBe('c1')
  })

  it('createShare fails soft on server errors and network failures', async () => {
    // a 200 without an id is a server bug — still null, never a throw
    vi.stubGlobal('fetch', vi.fn(async () => json({})))
    expect(await createShare('c1', 'X', [{ role: 'user', who: 'B', text: 'x' }])).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'invalid_request' }, 400)))
    expect(await createShare('c1', 'X', [{ role: 'user', who: 'B', text: 'x' }])).toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await createShare('c1', 'X', [{ role: 'user', who: 'B', text: 'x' }])).toBeNull()
  })

  it('revokeShare DELETEs by id; fetchShare reads publicly without a bearer', async () => {
    localStorage.setItem('nova.auth.token', 'tok-s')
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await revokeShare('sh-42')).toBe(true)
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe('DELETE')

    const pubMock = vi.fn(async () =>
      json({ title: 'X', createdAt: 'now', messages: [] }),
    )
    vi.stubGlobal('fetch', pubMock)
    const doc = await fetchShare('sh-42')
    expect(doc?.title).toBe('X')
    const init = (pubMock.mock.calls[0] as unknown as [string, RequestInit?])[1]
    expect(init).toBeUndefined() // plain public GET — no credentials attached

    vi.stubGlobal('fetch', vi.fn(async () => json({}, 404)))
    expect(await fetchShare('dead')).toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await revokeShare('sh-42')).toBe(false)
    expect(await fetchShare('sh-42')).toBeNull()
  })

  it('shareFileUrl points at the public share file route', () => {
    expect(shareFileUrl('sh-1', 'f-2')).toContain('/v1/shares/sh-1/files/f-2')
  })
})
