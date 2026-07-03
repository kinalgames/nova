import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickProfile } from '@nova/shared'
import app, { type Env } from './index'
import type { RateLimiter } from './ratelimit'

// a controllable fake session — B3 made /v1/chat session-gated, so the
// provider-dispatch tests need a signed-in caller without a real D1
const authState = vi.hoisted(() => ({
  session: null as null | {
    user: { id: string; name: string; email: string }
    session: { token: string }
  },
}))

vi.mock('./auth', () => ({
  createAuth: () => ({
    handler: async () => new Response(null, { status: 404 }),
    api: { getSession: async () => authState.session },
  }),
}))

const asUser = () => {
  authState.session = {
    user: { id: 'u-test', name: 'Tester', email: 'tester@kinal.co' },
    session: { token: 'sess-tok' },
  }
}

/** partial bindings for app.request's third argument */
const env = (o: Partial<Env>) => o as Env

beforeEach(() => {
  authState.session = null
})
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

  it('B4 — every response carries x-request-id (cf-ray when present)', async () => {
    const rayed = await app.request('/healthz', { headers: { 'cf-ray': 'ray-abc-123' } })
    expect(rayed.headers.get('x-request-id')).toBe('ray-abc-123')
    const fallback = await app.request('/v1/me')
    expect(fallback.status).toBe(401)
    expect(fallback.headers.get('x-request-id')).toBeTruthy()
  })

  it('B4 — API requests emit one structured log line', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await app.request('/v1/me', { headers: { 'cf-ray': 'ray-log-1' } })
    const line = spy.mock.calls
      .map((args) => String(args[0]))
      .find((s) => s.includes('"msg":"req"') && s.includes('ray-log-1'))
    expect(line).toBeTruthy()
    const parsed = JSON.parse(line!) as { path: string; status: number; ms: number }
    expect(parsed.path).toBe('/v1/me')
    expect(parsed.status).toBe(401)
    expect(parsed.ms).toBeGreaterThanOrEqual(0)
    spy.mockRestore()
  })

  it('POST /v1/chat rejects an invalid thinking level', async () => {
    asUser()
    const res = await app.request('/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'sk-x' },
        thinking: 'ultra',
      }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /v1/chat validates the request shape', async () => {
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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
    asUser()
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

  it('GET /v1/usage without a session is 401', async () => {
    const res = await app.request('/v1/usage')
    expect(res.status).toBe(401)
  })

  it('GET /v1/session-token without a session is 401', async () => {
    const res = await app.request('/v1/session-token')
    expect(res.status).toBe(401)
  })

  it('DELETE /v1/me without a session is 401', async () => {
    const res = await app.request('/v1/me', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('PATCH /v1/me without a session is 401', async () => {
    const res = await app.request('/v1/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assistantName: 'Bee' }),
    })
    expect(res.status).toBe(401)
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

describe('B3 — rate limiting + chat session gate', () => {
  const deny: RateLimiter = { limit: async () => ({ success: false }) }
  const grant: RateLimiter = { limit: async () => ({ success: true }) }

  it('an anonymous chat is 401 even with an inline profile — never an open relay', async () => {
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
    expect(res.status).toBe(401)
  })

  it('a rate-limited chat is 429 with retry-after, before any other work', async () => {
    const res = await app.request(
      '/v1/chat',
      { method: 'POST', body: '{}' },
      env({ RL_CHAT: deny }),
    )
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('60')
    expect(((await res.json()) as { code: string }).code).toBe('rate_limited')
  })

  it('auth POSTs are limited; GETs (OAuth callbacks) ride free', async () => {
    const post = await app.request(
      '/api/auth/sign-in/email',
      { method: 'POST', body: '{}' },
      env({ RL_AUTH: deny }),
    )
    expect(post.status).toBe(429)
    const get = await app.request('/api/auth/callback/google', {}, env({ RL_AUTH: deny }))
    expect(get.status).not.toBe(429)
  })

  it('other /v1 routes ride RL_API', async () => {
    const res = await app.request('/v1/me', {}, env({ RL_API: deny }))
    expect(res.status).toBe(429)
  })

  it('uploads share the heavy RL_CHAT budget; downloads stay on RL_API', async () => {
    const up = await app.request(
      '/v1/files',
      { method: 'POST', body: 'x' },
      env({ RL_CHAT: deny, RL_API: grant }),
    )
    expect(up.status).toBe(429)
    const down = await app.request('/v1/files/some-id', {}, env({ RL_CHAT: deny, RL_API: grant }))
    expect(down.status).toBe(401) // passed the limiter, stopped by the session gate
  })

  it('a granted or missing limiter never blocks — fail open', async () => {
    const ok = await app.request('/v1/me', {}, env({ RL_API: grant }))
    expect(ok.status).toBe(401) // falls through to the session gate
    const none = await app.request('/v1/me', {})
    expect(none.status).toBe(401)
  })

  it('a limiter crash fails open, never a 500', async () => {
    const broken: RateLimiter = {
      limit: async () => {
        throw new Error('binding exploded')
      },
    }
    const res = await app.request('/v1/me', {}, env({ RL_API: broken }))
    expect(res.status).toBe(401)
  })
})
