// happy-dom (default): credentials.ts reads the bearer token from localStorage
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addCredential,
  deleteCredential,
  exchangeGeminiCode,
  extractOAuthCode,
  listCredentials,
  patchCredential,
  pingCredential,
  startGeminiOAuth,
} from './credentials'

afterEach(() => vi.unstubAllGlobals())

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const row = {
  id: 'c1',
  providerId: 'claude',
  kind: 'api_key',
  name: 'K',
  hint: '…4321',
  status: 'active',
  priority: 0,
}

describe('credentials service — masked BYOK transport', () => {
  it('lists credentials on success, null on !ok, null on network throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ credentials: [row] })))
    expect(await listCredentials()).toEqual([row])
    vi.stubGlobal('fetch', vi.fn(async () => ok({}, 401)))
    expect(await listCredentials()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await listCredentials()).toBeNull()
  })

  it('adds a credential, returns the masked row or null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ credential: row }, 201)))
    expect(await addCredential('claude', 'api_key', 'K', 'sk-x')).toEqual(row)
    vi.stubGlobal('fetch', vi.fn(async () => ok({}, 400)))
    expect(await addCredential('claude', 'api_key', 'K', 'sk-x')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('x'))))
    expect(await addCredential('claude', 'api_key', 'K', 'sk-x')).toBeNull()
  })

  it('patch returns ok boolean and false on throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ credential: row })))
    expect(await patchCredential('c1', { priority: 2 })).toBe(true)
    vi.stubGlobal('fetch', vi.fn(async () => ok({}, 404)))
    expect(await patchCredential('c1', { status: 'error' })).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('x'))))
    expect(await patchCredential('c1', {})).toBe(false)
  })

  it('delete returns ok boolean and false on throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ ok: true })))
    expect(await deleteCredential('c1')).toBe(true)
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('x'))))
    expect(await deleteCredential('c1')).toBe(false)
  })

  it('ping maps http outcomes to a verdict + the failure reason', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('data: {}\n\n', { status: 200 })))
    expect(await pingCredential('c1', 'claude', 'claude-haiku-4-5')).toEqual({ status: 'active' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'rate_limited', detail: 'slow down' }), { status: 429 })),
    )
    expect(await pingCredential('c1', 'claude', 'claude-haiku-4-5')).toEqual({
      status: 'limited',
      detail: 'slow down',
      code: 'rate_limited',
      httpStatus: 429,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'invalid_credential', detail: 'x-api-key is not valid' }), { status: 400 })),
    )
    expect(await pingCredential('c1', 'claude', 'claude-haiku-4-5')).toEqual({
      status: 'error',
      detail: 'x-api-key is not valid',
      code: 'invalid_credential',
      httpStatus: 400,
    })
    // a body without detail falls back to the code, then the bare status
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 502 })))
    expect(await pingCredential('c1', 'claude', 'claude-haiku-4-5')).toEqual({
      status: 'error',
      detail: 'HTTP 502',
      code: undefined,
      httpStatus: 502,
    })
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await pingCredential('c1', 'claude', 'claude-haiku-4-5')).toEqual({
      status: 'error',
      detail: 'network',
      code: 'network',
    })
  })
})

describe('Gemini OAuth (D1 follow-up) — popup start + code exchange', () => {
  it('startGeminiOAuth returns the ready url; null on failure or network throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ url: 'https://accounts.google.com/x' })))
    expect(await startGeminiOAuth()).toBe('https://accounts.google.com/x')
    vi.stubGlobal('fetch', vi.fn(async () => ok({}, 500)))
    expect(await startGeminiOAuth()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await startGeminiOAuth()).toBeNull()
  })

  it('exchangeGeminiCode returns the refresh token on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ refreshToken: '1//abc' })))
    expect(await exchangeGeminiCode('4/0Ab')).toEqual({ ok: true, refreshToken: '1//abc' })
  })

  it('exchangeGeminiCode surfaces the server detail on failure, never throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ok({ code: 'oauth_exchange_failed', detail: 'invalid_grant' }, 400)),
    )
    expect(await exchangeGeminiCode('stale')).toEqual({
      ok: false,
      code: 'oauth_exchange_failed',
      detail: 'invalid_grant',
    })
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await exchangeGeminiCode('x')).toEqual({ ok: false, code: 'network', detail: 'network' })
  })

  it('extractOAuthCode parses the code out of a pasted failed-redirect URL', () => {
    expect(
      extractOAuthCode('http://localhost:58219/oauth2callback?state=x&code=4%2F0Ab_CODE&scope=email'),
    ).toBe('4/0Ab_CODE')
  })

  it('extractOAuthCode also accepts a bare pasted code', () => {
    expect(extractOAuthCode('  4/0Ab_bareCode  ')).toBe('4/0Ab_bareCode')
  })

  it('extractOAuthCode refuses a URL with no code param, and empty/whitespace input', () => {
    expect(extractOAuthCode('http://localhost:58219/oauth2callback?error=access_denied')).toBeNull()
    expect(extractOAuthCode('')).toBeNull()
    expect(extractOAuthCode('   ')).toBeNull()
    expect(extractOAuthCode('this is not a code')).toBeNull()
  })
})
