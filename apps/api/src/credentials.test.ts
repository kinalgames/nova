// Gemini OAuth follow-up (D1): /v1/credentials/oauth/gemini/{start,exchange}.
// Reuses gemini-cli's own public OAuth client — see the code comment in
// credentials.ts for why a redirect nobody listens on is correct here.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { credentials, type CredentialsEnv } from './credentials'

const authState = vi.hoisted(() => ({ session: null as null | { user: { id: string } } }))

vi.mock('./auth', () => ({
  createAuth: () => ({
    api: { getSession: async () => authState.session },
  }),
}))

const env = {
  GEMINI_OAUTH_CLIENT_ID: 'test-id.apps.googleusercontent.com',
  GEMINI_OAUTH_CLIENT_SECRET: 'test-secret',
} as CredentialsEnv

beforeEach(() => {
  authState.session = null
  vi.unstubAllGlobals()
})

describe('GET /oauth/gemini/start', () => {
  it('requires a session', async () => {
    const res = await credentials.request('/oauth/gemini/start', {}, env)
    expect(res.status).toBe(401)
  })

  it('builds the Google authorize URL with the redirect/scopes gemini-cli itself uses', async () => {
    authState.session = { user: { id: 'u1' } }
    const res = await credentials.request('/oauth/gemini/start', {}, env)
    expect(res.status).toBe(200)
    const { url } = (await res.json()) as { url: string }
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(parsed.searchParams.get('client_id')).toBe('test-id.apps.googleusercontent.com')
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:58219/oauth2callback')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    // always forces consent — otherwise a repeat login gets no refresh_token
    expect(parsed.searchParams.get('prompt')).toBe('consent')
    expect(parsed.searchParams.get('scope')).toContain('cloud-platform')
    expect(parsed.searchParams.get('scope')).toContain('userinfo.email')
  })

  it('502s honestly when the client id secret is missing', async () => {
    authState.session = { user: { id: 'u1' } }
    const res = await credentials.request('/oauth/gemini/start', {}, {} as CredentialsEnv)
    expect(res.status).toBe(500)
  })
})

describe('POST /oauth/gemini/exchange', () => {
  const post = (body: unknown) =>
    credentials.request(
      '/oauth/gemini/exchange',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      env,
    )

  it('requires a session', async () => {
    const res = await post({ code: 'abc' })
    expect(res.status).toBe(401)
  })

  it('rejects a missing/blank code without touching the network', async () => {
    authState.session = { user: { id: 'u1' } }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await post({})).status).toBe(400)
    expect((await post({ code: '  ' })).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exchanges a real code for the refresh token, posting the exact params Google expects', async () => {
    authState.session = { user: { id: 'u1' } }
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const params = new URLSearchParams(init.body as string)
      expect(params.get('code')).toBe('4/0Ab_code')
      expect(params.get('client_id')).toBe('test-id.apps.googleusercontent.com')
      expect(params.get('client_secret')).toBe('test-secret')
      expect(params.get('redirect_uri')).toBe('http://localhost:58219/oauth2callback')
      expect(params.get('grant_type')).toBe('authorization_code')
      return new Response(JSON.stringify({ refresh_token: '1//abc', access_token: 'ya29.x' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await post({ code: '4/0Ab_code' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ refreshToken: '1//abc' })
  })

  it('surfaces a Google-side rejection as 400, not a mute 500', async () => {
    authState.session = { user: { id: 'u1' } }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('invalid_grant: code already used', { status: 400 })),
    )
    const res = await post({ code: 'stale-code' })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string; detail: string }
    expect(body.code).toBe('oauth_exchange_failed')
    expect(body.detail).toContain('invalid_grant')
  })

  it('a response missing refresh_token is a clear 502, not a silent success', async () => {
    authState.session = { user: { id: 'u1' } }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ access_token: 'ya29.x' }), { status: 200 })),
    )
    const res = await post({ code: 'already-consented-before' })
    expect(res.status).toBe(502)
    expect(((await res.json()) as { code: string }).code).toBe('no_refresh_token')
  })

  it('a network failure to Google is a 502, never a crash', async () => {
    authState.session = { user: { id: 'u1' } }
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    const res = await post({ code: 'x' })
    expect(res.status).toBe(502)
    expect(((await res.json()) as { code: string }).code).toBe('upstream_unreachable')
  })
})
