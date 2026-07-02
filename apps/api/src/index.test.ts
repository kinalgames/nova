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
