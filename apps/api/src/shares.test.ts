import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSnapshot, shares } from './shares'

const authState = vi.hoisted(() => ({ session: null as null | { user: { id: string } } }))

vi.mock('./auth', () => ({
  createAuth: () => ({ api: { getSession: async () => authState.session } }),
}))

beforeEach(() => {
  authState.session = null
})

const msg = (over: object = {}) => ({
  role: 'user',
  who: 'THÀNH',
  text: 'xin chào',
  ...over,
})

describe('BE4 — snapshot validation', () => {
  it('accepts a clean transcript and normalizes file entries', () => {
    const out = parseSnapshot({
      messages: [
        msg(),
        msg({
          role: 'assistant',
          who: 'NOVA',
          files: [{ name: 'a.png', kind: 'image', fileId: 'f1' }],
        }),
      ],
    })
    expect(out).toHaveLength(2)
    expect(out?.[1].files?.[0]).toEqual({ name: 'a.png', kind: 'image', fileId: 'f1' })
  })

  it('rejects wrong roles, oversized text, foreign kinds and >4 files', () => {
    expect(parseSnapshot({ messages: [msg({ role: 'system' })] })).toBeNull()
    expect(parseSnapshot({ messages: [msg({ text: 'x'.repeat(50_001) })] })).toBeNull()
    expect(
      parseSnapshot({ messages: [msg({ files: [{ name: 'a', kind: 'exe' }] })] }),
    ).toBeNull()
    expect(
      parseSnapshot({
        messages: [msg({ files: Array(5).fill({ name: 'a', kind: 'md' }) })],
      }),
    ).toBeNull()
    expect(parseSnapshot({ messages: [] })).toBeNull()
    expect(parseSnapshot({})).toBeNull()
  })

  it('rejects a transcript whose total text exceeds the cap', () => {
    const big = Array.from({ length: 11 }, () => msg({ text: 'x'.repeat(49_000) }))
    expect(parseSnapshot({ messages: big })).toBeNull()
  })
})

describe('BE4 — share endpoints', () => {
  it('creating and revoking require a session; the payload is validated first', async () => {
    const post = await shares.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ convId: 'c1', title: 'X', messages: [msg()] }),
    })
    expect(post.status).toBe(401)
    const del = await shares.request('/some-id', { method: 'DELETE' })
    expect(del.status).toBe(401)

    authState.session = { user: { id: 'u1' } }
    const bad = await shares.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ convId: 'c1', title: 'X', messages: [msg({ role: 'root' })] }),
    })
    expect(bad.status).toBe(400)
  })
})
