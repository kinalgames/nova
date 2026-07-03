import { beforeEach, describe, expect, it, vi } from 'vitest'
import { files, kindOf } from './files'

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
