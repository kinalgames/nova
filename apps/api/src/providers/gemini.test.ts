import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  callGemini,
  geminiRequest,
  geminiThinkingConfig,
  parseAccountCredential,
  toNovaStream,
} from './gemini'

describe('B5 — thinkingConfig per level and model', () => {
  it("'off' floors at 128 on 2.5 Pro (cannot disable) and 0 on Flash", () => {
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro', thinking: 'off' })).toEqual({
      thinkingBudget: 128,
    })
    expect(geminiThinkingConfig({ model: 'gemini-2.5-flash', thinking: 'off' })).toEqual({
      thinkingBudget: 0,
    })
  })

  it("low/high map to fixed budgets; 'normal'/absent stay on dynamic default", () => {
    expect(geminiThinkingConfig({ model: 'gemini-2.5-flash', thinking: 'low' })).toEqual({
      thinkingBudget: 2048,
    })
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro', thinking: 'high' })).toEqual({
      thinkingBudget: 24576,
    })
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro', thinking: 'normal' })).toBeNull()
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro' })).toBeNull()
  })

  it('a Gemini 3.x id sends no budget (that generation takes thinkingLevel)', () => {
    expect(geminiThinkingConfig({ model: 'gemini-3-pro', thinking: 'high' })).toBeNull()
  })

  it('the budget rides inside generationConfig on the shared request', () => {
    const req = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
      profile: { kind: 'api_key', credential: 'AIza-x' },
      thinking: 'high',
    }) as { generationConfig: { thinkingConfig?: { thinkingBudget: number } } }
    expect(req.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 24576 })
  })
})
import { ProviderConfigError } from './shared'

afterEach(() => vi.unstubAllGlobals())

const oauthEnv = {
  GEMINI_OAUTH_CLIENT_ID: 'test-id.apps.googleusercontent.com',
  GEMINI_OAUTH_CLIENT_SECRET: 'test-oauth-secret',
}

const baseReq = {
  providerId: 'gemini' as const,
  model: 'gemini-2.5-flash',
  system: 'Chỉ dẫn dự án',
  messages: [
    { role: 'user' as const, content: 'chào' },
    { role: 'assistant' as const, content: 'chào bạn' },
    { role: 'user' as const, content: 'tiếp đi' },
  ],
  profile: { kind: 'api_key' as const, credential: 'AIza-test' },
}

describe('gemini adapter — request shape', () => {
  it('maps roles to user/model and carries systemInstruction + maxOutputTokens', () => {
    const body = geminiRequest(baseReq)
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'chào' }] },
      { role: 'model', parts: [{ text: 'chào bạn' }] },
      { role: 'user', parts: [{ text: 'tiếp đi' }] },
    ])
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'Chỉ dẫn dự án' }] })
    expect(body.generationConfig).toEqual({ maxOutputTokens: 8192 })
  })

  it('omits systemInstruction without a system prompt and honors maxTokens', () => {
    const body = geminiRequest({ ...baseReq, system: undefined, maxTokens: 64 })
    expect(body.systemInstruction).toBeUndefined()
    expect(body.generationConfig).toEqual({ maxOutputTokens: 64 })
  })
})

describe('gemini adapter — api_key transport (official)', () => {
  it('POSTs to generativelanguage with x-goog-api-key and SSE streaming', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await callGemini(baseReq)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse',
    )
    const headers = init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('AIza-test')
    expect(headers.authorization).toBeUndefined()
  })
})

describe('gemini adapter — account credential parsing', () => {
  it('accepts a raw access token', () => {
    expect(parseAccountCredential('ya29.abc')).toEqual({ accessToken: 'ya29.abc' })
  })
  it('accepts a raw refresh token (1//…)', () => {
    expect(parseAccountCredential('1//0abc')).toEqual({ refreshToken: '1//0abc' })
  })
  it('accepts the oauth_creds.json blob and prefers the refresh token', () => {
    const blob = JSON.stringify({ access_token: 'ya29.x', refresh_token: '1//0y', scope: 's' })
    expect(parseAccountCredential(blob)).toEqual({ refreshToken: '1//0y' })
  })
  it('falls back to access_token when the blob has no refresh token', () => {
    expect(parseAccountCredential('{"access_token":"ya29.z"}')).toEqual({ accessToken: 'ya29.z' })
  })
  it('rejects malformed JSON and empty blobs', () => {
    expect(() => parseAccountCredential('{nope')).toThrow(ProviderConfigError)
    expect(() => parseAccountCredential('{}')).toThrow(ProviderConfigError)
    expect(() => parseAccountCredential('   ')).toThrow(ProviderConfigError)
  })
})

describe('gemini adapter — account transport (Code Assist, experimental)', () => {
  it('with an access token: discovers the project then streams via cloudcode-pa', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes(':loadCodeAssist'))
        return Response.json({ cloudaicompanionProject: 'proj-1' })
      return new Response('', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await callGemini({
      ...baseReq,
      profile: { kind: 'account', credential: 'ya29.token' },
    })
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [loadUrl, loadInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(loadUrl).toBe('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist')
    expect((loadInit.headers as Record<string, string>).authorization).toBe('Bearer ya29.token')
    const [streamUrl, streamInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(streamUrl).toBe(
      'https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse',
    )
    const body = JSON.parse(streamInit.body as string) as Record<string, unknown>
    expect(body.model).toBe('gemini-2.5-flash')
    expect(body.project).toBe('proj-1')
    expect((body.request as Record<string, unknown>).contents).toBeDefined()
  })

  it('with a refresh token: exchanges it via the configured OAuth client first', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://oauth2.googleapis.com/token')
        return Response.json({ access_token: 'ya29.fresh', expires_in: 3599 })
      if (url.includes(':loadCodeAssist'))
        return Response.json({ cloudaicompanionProject: 'proj-2' })
      return new Response('', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await callGemini(
      { ...baseReq, profile: { kind: 'account', credential: '1//0refresh' } },
      undefined,
      oauthEnv,
    )
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [, tokenInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const form = new URLSearchParams(tokenInit.body as string)
    expect(form.get('grant_type')).toBe('refresh_token')
    expect(form.get('refresh_token')).toBe('1//0refresh')
    expect(form.get('client_id')).toBe('test-id.apps.googleusercontent.com')
    expect(form.get('client_secret')).toBe('test-oauth-secret')
    const [, streamInit] = fetchMock.mock.calls[2] as unknown as [string, RequestInit]
    expect((streamInit.headers as Record<string, string>).authorization).toBe('Bearer ya29.fresh')
  })

  it('a refresh token without the configured OAuth client is a config error, not a fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      callGemini({ ...baseReq, profile: { kind: 'account', credential: '1//0refresh' } }),
    ).rejects.toThrow(ProviderConfigError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a failed token refresh as the upstream response', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await callGemini(
      { ...baseReq, profile: { kind: 'account', credential: '1//0expired' } },
      undefined,
      oauthEnv,
    )
    expect(res.status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a clear error when the account has no Code Assist project yet', async () => {
    const fetchMock = vi.fn(async () => Response.json({ currentTier: {} }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await callGemini({
      ...baseReq,
      profile: { kind: 'account', credential: 'ya29.token' },
    })
    expect(res.ok).toBe(false)
    const body = (await res.json()) as { error: { message: string } }
    expect(body.error.message).toContain('gemini-cli')
  })
})

function sse(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l + '\n'))
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text()
  return text
    .split('\n\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)) as Record<string, unknown>)
}

describe('gemini adapter — SSE transform to the Nova contract', () => {
  it('maps plain (api_key) chunks: start, deltas, usage on stop', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"Xin "}],"role":"model"}}],"usageMetadata":{"promptTokenCount":9}}',
          'data: {"candidates":[{"content":{"parts":[{"text":"chào"}],"role":"model"},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":9,"candidatesTokenCount":5,"totalTokenCount":14}}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'block_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events[1].text).toBe('Xin ')
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 9, outputTokens: 5 })
  })

  it('unwraps Code Assist chunks ({response:…}) and counts thought tokens as output', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":2,"thoughtsTokenCount":4}}}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual(['message_start', 'block_delta', 'message_stop'])
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 3, outputTokens: 6 })
  })

  it('surfaces upstream error payloads and suppresses the stop event', async () => {
    const events = await collect(
      toNovaStream(
        sse(['data: {"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED"}}']),
      ),
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'error',
      code: 'RESOURCE_EXHAUSTED',
      message: 'quota',
    })
  })

  it('ignores malformed lines and still closes the contract', async () => {
    const events = await collect(toNovaStream(sse(['data: {broken', ': keepalive', ''])))
    expect(events.map((e) => e.type)).toEqual(['message_stop'])
  })
})
