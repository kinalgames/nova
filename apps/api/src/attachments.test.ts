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
