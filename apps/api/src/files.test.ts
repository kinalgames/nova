import { beforeEach, describe, expect, it, vi } from 'vitest'
import { files, kindOf, signAttachmentUrl, type FilesEnv } from './files'

// controllable fake session — validation paths run before any D1/R2 touch
const authState = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
}))

vi.mock('./auth', () => ({
  createAuth: () => ({
    api: { getSession: async () => authState.session },
  }),
}))

beforeEach(() => {
  authState.session = null
})

const upload = (name: string, mime: string, bytes: number) =>
  files.request('/', {
    method: 'POST',
    headers: { 'x-file-name': encodeURIComponent(name), 'content-type': mime },
    body: new Uint8Array(bytes),
  })

describe('B1 — attachment upload validation', () => {
  it('uploading and serving require a session', async () => {
    expect((await upload('a.png', 'image/png', 10)).status).toBe(401)
    expect((await files.request('/some-id')).status).toBe(401)
  })

  it('rejects types outside the whitelist with 415', async () => {
    authState.session = { user: { id: 'u1' } }
    const res = await upload('virus.exe', 'application/x-msdownload', 10)
    expect(res.status).toBe(415)
  })

  it('enforces the 5MB image / 10MB document caps with 413', async () => {
    authState.session = { user: { id: 'u1' } }
    const img = await upload('big.png', 'image/png', 5 * 1024 * 1024 + 1)
    expect(img.status).toBe(413)
    const doc = await upload('big.pdf', 'application/pdf', 10 * 1024 * 1024 + 1)
    expect(doc.status).toBe(413)
  })

  it('rejects an empty file and a missing name', async () => {
    authState.session = { user: { id: 'u1' } }
    expect((await upload('a.png', 'image/png', 0)).status).toBe(400)
    const noName = await files.request('/', {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: new Uint8Array(4),
    })
    expect(noName.status).toBe(400)
  })
})

describe('T4.5 — signed attachment URLs (sessionless provider fetch)', () => {
  // 32 zero-ish bytes, base64 — shape-compatible with CREDENTIALS_KEY
  const env = { CREDENTIALS_KEY: btoa('A'.repeat(32)) } as FilesEnv

  it('signs an absolute URL with exp + 64-hex HMAC', async () => {
    const url = await signAttachmentUrl(env, 'att-1', 'https://nova.kinal.co')
    const u = new URL(url)
    expect(u.origin).toBe('https://nova.kinal.co')
    expect(u.pathname).toBe('/v1/files/signed/att-1')
    expect(Number(u.searchParams.get('exp'))).toBeGreaterThan(Date.now() / 1000)
    expect(u.searchParams.get('sig')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('an expired link 404s uniformly — before any signature math', async () => {
    const url = await signAttachmentUrl(env, 'att-1', 'https://x.vn', Date.now() - 16 * 60 * 1000)
    const u = new URL(url)
    const res = await files.request(`${u.pathname.replace('/v1/files', '')}${u.search}`, {}, env)
    expect(res.status).toBe(404)
  })

  it('a tampered signature 404s without touching storage', async () => {
    const url = await signAttachmentUrl(env, 'att-1', 'https://x.vn')
    const u = new URL(url)
    const sig = u.searchParams.get('sig')!
    u.searchParams.set('sig', (sig[0] === 'f' ? '0' : 'f') + sig.slice(1))
    const res = await files.request(`/signed/att-1${u.search}`, {}, env)
    expect(res.status).toBe(404)
  })

  it('missing query params 404 uniformly', async () => {
    expect((await files.request('/signed/att-1', {}, env)).status).toBe(404)
  })
})

describe('B1 — kind classification mirrors the client', () => {
  it('classifies by mime first, then extension', () => {
    expect(kindOf('x.png', 'image/png')).toBe('image')
    expect(kindOf('x.pdf', 'application/pdf')).toBe('pdf')
    expect(kindOf('x.csv', 'text/csv')).toBe('csv')
    expect(kindOf('x.md', '')).toBe('md')
    expect(kindOf('x.py', '')).toBe('code')
    expect(kindOf('x.json', 'application/json')).toBe('code')
    expect(kindOf('x.zip', 'application/zip')).toBeNull()
  })
})
