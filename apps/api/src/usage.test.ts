import { afterEach, describe, expect, it, vi } from 'vitest'
import { tapNovaUsage } from './usage'
import app from './index'

// a valid session everywhere — the unauthenticated 401s live in index.test.ts
vi.mock('./auth', () => ({
  createAuth: () => ({
    api: { getSession: async () => ({ user: { id: 'u1' } }) },
    handler: async () => new Response('ok'),
  }),
}))

afterEach(() => vi.unstubAllGlobals())

function novaSse(frames: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const f of frames) controller.enqueue(enc.encode(`data: ${f}\n\n`))
      controller.close()
    },
  })
}

describe('T8 — tapNovaUsage', () => {
  it('passes the stream through untouched and reports message_stop usage once', async () => {
    const onStop = vi.fn()
    const tapped = tapNovaUsage(
      novaSse([
        '{"type":"message_start"}',
        '{"type":"block_delta","text":"xin chào"}',
        '{"type":"message_stop","usage":{"inputTokens":12,"outputTokens":7}}',
      ]),
      onStop,
    )
    const text = await new Response(tapped).text()
    expect(text).toContain('"text":"xin chào"')
    expect(text).toContain('"type":"message_stop"')
    expect(onStop).toHaveBeenCalledTimes(1)
    expect(onStop).toHaveBeenCalledWith({ inputTokens: 12, outputTokens: 7 })
  })

  it('does not report on an error-terminated stream', async () => {
    const onStop = vi.fn()
    const tapped = tapNovaUsage(novaSse(['{"type":"error","code":"x","message":"y"}']), onStop)
    await new Response(tapped).text()
    expect(onStop).not.toHaveBeenCalled()
  })
})

describe('T8 — chat proxy writes an Analytics Engine datapoint per reply', () => {
  const chat = (env: Record<string, unknown>) =>
    app.request(
      '/v1/chat',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          providerId: 'claude',
          model: 'claude-haiku-4-5',
          messages: [{ role: 'user', content: 'hi' }],
          profile: { kind: 'api_key', credential: 'sk-x' },
        }),
      },
      env,
    )

  const anthropicUpstream = () => {
    const enc = new TextEncoder()
    return new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(
          enc.encode(
            'data: {"type":"message_start","message":{"usage":{"input_tokens":3}}}\n' +
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n' +
              'data: {"type":"message_delta","usage":{"output_tokens":2}}\n' +
              'data: {"type":"message_stop"}\n',
          ),
        )
        c.close()
      },
    })
  }

  it('records {provider, model, kind} blobs, token doubles and the user index', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(anthropicUpstream(), { status: 200 })),
    )
    const writeDataPoint = vi.fn()
    const res = await chat({ USAGE: { writeDataPoint } })
    expect(res.status).toBe(200)
    await res.text() // drain the stream — the tap meters as bytes flow
    expect(writeDataPoint).toHaveBeenCalledTimes(1)
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ['claude', 'claude-haiku-4-5', 'api_key'],
      doubles: [3, 2],
      indexes: ['u1'],
    })
  })

  it('streams normally when the dataset binding is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(anthropicUpstream(), { status: 200 })),
    )
    const res = await chat({})
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('"type":"message_stop"')
  })
})

describe('T8 — GET /v1/usage (AE SQL read-back)', () => {
  it('is 501 when the deployment has no SQL read credentials', async () => {
    const res = await app.request('/v1/usage', {}, {})
    expect(res.status).toBe(501)
    expect(((await res.json()) as { code: string }).code).toBe('not_configured')
  })

  it('queries the month roll-up for the session user and normalizes numbers', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          { providerId: 'gemini', modelId: 'gemini-2.5-flash', kind: 'api_key', inTok: '120', outTok: '45' },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.request('/v1/usage', {}, { CF_ACCOUNT_ID: 'acc1', AE_SQL_TOKEN: 'ae-tok' })
    expect(res.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acc1/analytics_engine/sql')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer ae-tok')
    const sql = init.body as string
    expect(sql).toContain("index1 = 'u1'")
    expect(sql).toContain('nova_usage')
    expect(sql).toContain('toDateTime')
    expect(sql).toContain('_sample_interval')
    const body = (await res.json()) as { rows: { inTok: number; outTok: number }[] }
    expect(body.rows).toEqual([
      { providerId: 'gemini', modelId: 'gemini-2.5-flash', kind: 'api_key', inTok: 120, outTok: 45 },
    ])
  })

  it('surfaces an AE SQL failure as a 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    const res = await app.request('/v1/usage', {}, { CF_ACCOUNT_ID: 'acc1', AE_SQL_TOKEN: 'ae-tok' })
    expect(res.status).toBe(502)
  })
})
