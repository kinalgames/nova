import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickProfile } from '@nova/shared'
import app from './index'

afterEach(() => vi.unstubAllGlobals())

describe('nova-api skeleton', () => {
  it('healthz reports the service is up', async () => {
    const res = await app.request('/healthz')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; service: string }
    expect(body.ok).toBe(true)
    expect(body.service).toBe('nova-api')
  })

  it('unknown routes 404', async () => {
    const res = await app.request('/nope')
    expect(res.status).toBe(404)
  })

  it('POST /v1/chat validates the request shape', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerId: 'claude', model: '', messages: [] }),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('invalid_request')
  })

  it('POST /v1/chat proxies a stream and transforms it to the Nova contract', async () => {
    const enc = new TextEncoder()
    const upstream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(
          enc.encode(
            'data: {"type":"message_start","message":{"usage":{"input_tokens":3}}}\n' +
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n' +
              'data: {"type":"message_delta","usage":{"output_tokens":1}}\n' +
              'data: {"type":"message_stop"}\n',
          ),
        )
        c.close()
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(upstream, { status: 200 })),
    )
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'sk-x' },
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const text = await res.text()
    expect(text).toContain('"type":"block_delta"')
    expect(text).toContain('"outputTokens":1')
  })

  it('POST /v1/chat maps upstream 429 to rate_limited and keeps retry-after', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"error":{"type":"rate_limit_error"}}', {
            status: 429,
            headers: { 'retry-after': '30' },
          }),
      ),
    )
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'account', credential: 'sk-ant-oat01-x' },
      }),
    })
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('30')
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('rate_limited')
  })

  it('the shared domain engine resolves from the api workspace', () => {
    // the provider-proxy layer (BE3) reuses the client-proven rotation engine
    const picked = pickProfile(
      [
        { id: 'a', name: 'a', kind: 'api_key', credential: 'k', status: 'error' },
        { id: 'b', name: 'b', kind: 'api_key', credential: 'k', status: 'active' },
      ],
      undefined,
      true,
    )
    expect(picked?.id).toBe('b')
  })
})

describe('T6 — multi-provider dispatch', () => {
  it('routes a gemini api_key chat to generativelanguage and transforms the stream', async () => {
    const enc = new TextEncoder()
    const upstream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(
          enc.encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":2,"candidatesTokenCount":1}}\n',
          ),
        )
        c.close()
      },
    })
    const fetchMock = vi.fn(async (_url: string) => new Response(upstream, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'gemini',
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'AIza-x' },
      }),
    })
    expect(res.status).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent',
    )
    const text = await res.text()
    expect(text).toContain('"type":"block_delta"')
    expect(text).toContain('"inputTokens":2')
  })

  it('routes an openai chat with the Bearer key to chat completions', async () => {
    const fetchMock = vi.fn(
      async () => new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'openai',
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'sk-o' },
      }),
    })
    expect(res.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-o')
  })

  it('rejects an account credential for a provider that only takes api keys', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'openai',
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'account', credential: 'whatever' },
      }),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { code: string }).code).toBe('invalid_request')
  })

  it('rejects an unknown providerId', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'grok',
        model: 'x',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'k' },
      }),
    })
    expect(res.status).toBe(400)
  })

  it('maps an unusable ollama endpoint to 400 invalid_credential, not a 502', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'ollama',
        model: 'llama3.2',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'không-phải-url' },
      }),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { code: string }).code).toBe('invalid_credential')
  })
})

describe('BE3 — sealed BYOK surface', () => {
  it('credentials CRUD requires a session', async () => {
    for (const [method, path] of [
      ['GET', '/v1/credentials'],
      ['POST', '/v1/credentials'],
      ['PATCH', '/v1/credentials/x'],
      ['DELETE', '/v1/credentials/x'],
    ] as const) {
      const res = await app.request(path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'GET' ? undefined : '{}',
      })
      expect(res.status, `${method} ${path}`).toBe(401)
    }
  })

  it('a chat with BOTH credential sources is rejected', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', content: 'hi' }],
        credentialId: 'abc',
        profile: { kind: 'api_key', credential: 'sk-x' },
      }),
    })
    expect(res.status).toBe(400)
  })

  it('a chat with NEITHER credential source is rejected', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    expect(res.status).toBe(400)
  })

  it('a stored-credential chat without a session is 401', async () => {
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', content: 'hi' }],
        credentialId: 'does-not-matter',
      }),
    })
    expect(res.status).toBe(401)
  })
})
