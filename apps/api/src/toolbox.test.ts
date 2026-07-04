// T5 — the files tool executor: owner-scoped list/read with hard budgets.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filesTool, makeFilesExecutor, type ToolboxEnv } from './toolbox'

const store = vi.hoisted(() => ({
  rows: [] as { id: string; name: string; kind: string; size: number }[],
  items: new Map<string, { kind: string; name: string; mime: string; size: number; text?: string }>(),
}))

vi.mock('./files', () => ({
  loadAttachment: async (_env: unknown, _uid: string, id: string) => {
    const item = store.items.get(id)
    if (!item) return null
    const bytes = new TextEncoder().encode(item.text ?? 'BYTES').buffer as ArrayBuffer
    return { row: { ...item, id, r2Key: `att/u1/${id}` }, bytes }
  },
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => store.rows }),
      }),
    }),
  }),
}))

const env = {} as ToolboxEnv
const call = (args: string) => ({ id: 't1', name: 'files', args })

beforeEach(() => {
  store.rows = []
  store.items.clear()
})

describe('T5 — files tool executor', () => {
  it('declares a strict read-only schema', () => {
    expect(filesTool.name).toBe('files')
    expect((filesTool.parameters as { required: string[] }).required).toEqual(['op'])
  })

  it('lists the user files as id · name · kind · size lines', async () => {
    store.rows = [
      { id: 'f1', name: 'notes.md', kind: 'md', size: 120 },
      { id: 'f2', name: 'plan.pdf', kind: 'pdf', size: 9000 },
    ]
    const run = makeFilesExecutor(env, 'u1')
    const res = await run(call('{"op":"list"}'))
    expect(res.ok).toBe(true)
    expect(res.content).toBe('f1 · notes.md · md · 120B\nf2 · plan.pdf · pdf · 9000B')
    expect(res.summary).toBe('2 files')
  })

  it('reads a text file, truncating at the 16KB cap', async () => {
    store.items.set('f1', { kind: 'md', name: 'notes.md', mime: 'text/markdown', size: 20_000, text: 'x'.repeat(20_000) })
    const run = makeFilesExecutor(env, 'u1')
    const res = await run(call('{"op":"read","id":"f1"}'))
    expect(res.ok).toBe(true)
    expect(res.content).toContain('[truncated at 16KB of 20000B]')
    expect(res.content.length).toBeLessThan(17_000)
  })

  it('binary kinds refuse politely; the read budget is 3 per request', async () => {
    store.items.set('img', { kind: 'image', name: 'a.png', mime: 'image/png', size: 5 })
    const run = makeFilesExecutor(env, 'u1')
    expect((await run(call('{"op":"read","id":"img"}'))).ok).toBe(false)
    // three more reads exhaust the budget (the binary refusal counted as one)
    store.items.set('t', { kind: 'md', name: 't.md', mime: 'text/markdown', size: 2, text: 'ok' })
    expect((await run(call('{"op":"read","id":"t"}'))).ok).toBe(true)
    expect((await run(call('{"op":"read","id":"t"}'))).ok).toBe(true)
    const fourth = await run(call('{"op":"read","id":"t"}'))
    expect(fourth.ok).toBe(false)
    expect(fourth.content).toContain('budget')
  })

  it('rejects unknown tools, bad JSON, bad ops, and missing ids', async () => {
    const run = makeFilesExecutor(env, 'u1')
    expect((await run({ id: 'x', name: 'bash', args: '{}' })).ok).toBe(false)
    expect((await run(call('not-json'))).ok).toBe(false)
    expect((await run(call('{"op":"write"}'))).ok).toBe(false)
    expect((await run(call('{"op":"read"}'))).ok).toBe(false)
    expect((await run(call('{"op":"read","id":"ghost"}'))).ok).toBe(false)
  })
})
