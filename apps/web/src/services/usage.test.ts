import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMonthUsage } from './usage'

beforeEach(() => localStorage.clear())

describe('usage service — GET /v1/usage transport', () => {
  it('returns the rows with the bearer token attached', async () => {
    localStorage.setItem('nova.auth.token', 'tok-1')
    const fetchMock = vi.fn(async () =>
      Response.json({
        month: '2026-07',
        rows: [{ providerId: 'openai', modelId: 'gpt-5.4-mini', kind: 'api_key', inTok: 10, outTok: 20 }],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const rows = await fetchMonthUsage()
    expect(rows).toHaveLength(1)
    expect(rows?.[0]).toMatchObject({ providerId: 'openai', inTok: 10 })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/usage')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-1')
  })

  it('is null on a non-ok response (501 not_configured included)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 501 })))
    expect(await fetchMonthUsage()).toBeNull()
  })

  it('is null when the network throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await fetchMonthUsage()).toBeNull()
  })
})
