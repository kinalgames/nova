import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAttachments } from './attachments'
import type { FilesEnv } from './files'

// the resolver's only dependency — owner-checked bytes+metadata lookup
const store = vi.hoisted(() => ({
  items: new Map<string, { kind: string; name: string; mime: string; text?: string }>(),
}))

vi.mock('./files', () => ({
  loadAttachment: async (_env: unknown, _uid: string, id: string) => {
    const item = store.items.get(id)
    if (!item) return null
    const bytes = new TextEncoder().encode(item.text ?? 'BYTES').buffer as ArrayBuffer
    return { row: { ...item, id, r2Key: `att/u1/${id}`, size: 5 }, bytes }
  },
  loadAttachmentRow: async (_env: unknown, _uid: string, id: string) => {
    const item = store.items.get(id)
    return item ? { ...item, id, r2Key: `att/u1/${id}`, size: 5 } : null
  },
  signAttachmentUrl: async (_env: unknown, id: string, origin: string) =>
    `${origin}/v1/files/signed/${id}?exp=9999&sig=deadbeef`,
}))

const env = {} as FilesEnv

beforeEach(() => store.items.clear())

describe('B1 — attachment resolution', () => {
  it('text files fold into the turn text as a named fence', async () => {
    store.items.set('f1', { kind: 'code', name: 'main.py', mime: 'text/plain', text: 'print(1)' })
    const out = await resolveAttachments(env, 'u1', [
      { role: 'user', content: 'đọc giúp mình', attachments: [{ id: 'f1' }] },
    ])
    expect(out[0].content).toContain('[file: main.py]')
    expect(out[0].content).toContain('print(1)')
    expect(out[0].content).toContain('đọc giúp mình')
    expect(out[0].parts).toBeUndefined()
  })

  it('images and PDFs become base64 parts, in order, ahead of the text', async () => {
    store.items.set('img', { kind: 'image', name: 'chart.png', mime: 'image/png' })
    store.items.set('doc', { kind: 'pdf', name: 'plan.pdf', mime: 'application/pdf' })
    const out = await resolveAttachments(env, 'u1', [
      { role: 'user', content: 'phân tích', attachments: [{ id: 'img' }, { id: 'doc' }] },
    ])
    expect(out[0].parts).toHaveLength(2)
    expect(out[0].parts?.[0]).toMatchObject({ type: 'image', mime: 'image/png' })
    expect(out[0].parts?.[1]).toMatchObject({ type: 'pdf', name: 'plan.pdf' })
    expect(out[0].parts?.[0].base64).toBe(btoa('BYTES'))
  })

  it('a missing or foreign ref degrades into a note instead of failing', async () => {
    const out = await resolveAttachments(env, 'u1', [
      { role: 'user', content: 'xem file', attachments: [{ id: 'nope' }] },
    ])
    expect(out[0].content).toContain('[attached: nope — content unavailable]')
    expect(out[0].parts).toBeUndefined()
  })

  it('T4.5 — URL-capable providers get signed URLs, bytes never load', async () => {
    store.items.set('img', { kind: 'image', name: 'chart.png', mime: 'image/png' })
    store.items.set('doc', { kind: 'pdf', name: 'plan.pdf', mime: 'application/pdf' })
    const out = await resolveAttachments(
      env,
      'u1',
      [{ role: 'user', content: 'xem đi', attachments: [{ id: 'img' }, { id: 'doc' }] }],
      { providerId: 'claude', publicOrigin: 'https://nova.kinal.co' },
    )
    expect(out[0].parts?.[0]).toEqual({
      type: 'image',
      name: 'chart.png',
      mime: 'image/png',
      url: 'https://nova.kinal.co/v1/files/signed/img?exp=9999&sig=deadbeef',
    })
    expect(out[0].parts?.[1]).toMatchObject({ type: 'pdf', url: expect.stringContaining('/signed/doc') })
    expect(out[0].parts?.[0]).not.toHaveProperty('base64')
  })

  it('T4.5 — URL mode still folds text files and notes missing refs', async () => {
    store.items.set('src', { kind: 'code', name: 'main.py', mime: 'text/plain', text: 'print(2)' })
    const out = await resolveAttachments(
      env,
      'u1',
      [{ role: 'user', content: 'đọc code', attachments: [{ id: 'src' }, { id: 'ghost' }] }],
      { providerId: 'openai', publicOrigin: 'https://nova.kinal.co' },
    )
    expect(out[0].content).toContain('print(2)')
    expect(out[0].content).toContain('[attached: ghost — content unavailable]')
    expect(out[0].parts).toBeUndefined()
  })

  it('T4.5 — gemini and plain-http origins stay on inline base64', async () => {
    store.items.set('img', { kind: 'image', name: 'chart.png', mime: 'image/png' })
    for (const opts of [
      { providerId: 'gemini' as const, publicOrigin: 'https://nova.kinal.co' },
      { providerId: 'claude' as const, publicOrigin: 'http://localhost:8787' },
      { providerId: 'claude' as const },
    ]) {
      const out = await resolveAttachments(
        env,
        'u1',
        [{ role: 'user', content: 'xem', attachments: [{ id: 'img' }] }],
        opts,
      )
      expect(out[0].parts?.[0]).toMatchObject({ type: 'image', base64: btoa('BYTES') })
      expect(out[0].parts?.[0]).not.toHaveProperty('url')
    }
  })

  it('T4.5 — gemini rides a tighter inline budget (20MB request cap)', async () => {
    // 15MB raw: over gemini's 14MB budget, under the 18MB default
    store.items.set('big', {
      kind: 'pdf',
      name: 'big.pdf',
      mime: 'application/pdf',
      text: 'x'.repeat(15 * 1024 * 1024),
    })
    const turns = [{ role: 'user' as const, content: 'xem', attachments: [{ id: 'big' }] }]
    const gemini = await resolveAttachments(env, 'u1', turns, { providerId: 'gemini' })
    expect(gemini[0].parts).toBeUndefined()
    expect(gemini[0].content).toContain('[attached: big.pdf — content unavailable]')
    const fallback = await resolveAttachments(env, 'u1', turns, { providerId: 'claude' })
    expect(fallback[0].parts?.[0]).toMatchObject({ type: 'pdf', name: 'big.pdf' })
  })

  it('turns without refs pass through untouched', async () => {
    const out = await resolveAttachments(env, 'u1', [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'chào bạn' },
    ])
    expect(out).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'chào bạn' },
    ])
  })
})
