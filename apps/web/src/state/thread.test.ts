// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  addSibling,
  appendToLeaf,
  fromLinear,
  sanitizeThread,
  sanitizeThreads,
  selectSibling,
  siblingInfo,
  updateMessage,
  visibleLeaf,
  visiblePath,
  type Thread,
} from './thread'
import type { Message } from './types'

const m = (id: string, role: Message['role'] = 'user', text = id): Message => ({
  id,
  role,
  who: role === 'user' ? 'THÀNH' : 'NOVA',
  blocks: [{ type: 'text', text }],
})

const ids = (t: ReturnType<typeof fromLinear>) => visiblePath(t).map((x) => x.id)

describe('thread — linear building blocks', () => {
  it('fromLinear chains messages and shows them all', () => {
    const t = fromLinear([m('a'), m('b', 'assistant'), m('c')])
    expect(ids(t)).toEqual(['a', 'b', 'c'])
    expect(visibleLeaf(t)?.id).toBe('c')
  })

  it('appendToLeaf extends the visible conversation', () => {
    const t = appendToLeaf(fromLinear([m('a')]), m('b', 'assistant'))
    expect(ids(t)).toEqual(['a', 'b'])
  })
})

describe('thread — versions (siblings)', () => {
  it('addSibling creates version 2, selects it, and DROPS the old tail', () => {
    // a → b → c ; edit b → b2
    const t0 = fromLinear([m('a'), m('b', 'assistant'), m('c')])
    const t1 = addSibling(t0, 'b', m('b2', 'assistant'))
    expect(ids(t1)).toEqual(['a', 'b2'])
    expect(siblingInfo(t1, 'b2')).toEqual({ index: 2, count: 2 })
  })

  it('selectSibling navigates back to version 1 and its tail returns', () => {
    const t0 = fromLinear([m('a'), m('b', 'assistant'), m('c')])
    const t1 = addSibling(t0, 'b', m('b2', 'assistant'))
    const t2 = selectSibling(t1, 'b2', -1)
    expect(ids(t2)).toEqual(['a', 'b', 'c'])
    const t3 = selectSibling(t2, 'b', +1)
    expect(ids(t3)).toEqual(['a', 'b2'])
  })

  it('each version keeps its OWN tail', () => {
    const t0 = fromLinear([m('a'), m('b', 'assistant'), m('c')])
    let t = addSibling(t0, 'b', m('b2', 'assistant'))
    t = appendToLeaf(t, m('d')) // tail of b2
    expect(ids(t)).toEqual(['a', 'b2', 'd'])
    t = selectSibling(t, 'b2', -1)
    expect(ids(t)).toEqual(['a', 'b', 'c'])
    t = selectSibling(t, 'b', +1)
    expect(ids(t)).toEqual(['a', 'b2', 'd'])
  })

  it('selection clamps at both ends', () => {
    const t0 = addSibling(fromLinear([m('a')]), 'a', m('a2'))
    expect(ids(selectSibling(t0, 'a2', +5))).toEqual(['a2'])
    expect(ids(selectSibling(t0, 'a2', -5))).toEqual(['a'])
  })

  it('root-level messages can be versioned too', () => {
    const t = addSibling(fromLinear([m('a'), m('r', 'assistant')]), 'a', m('a2'))
    expect(ids(t)).toEqual(['a2'])
    expect(siblingInfo(t, 'a2')).toEqual({ index: 2, count: 2 })
  })
})

describe('thread — defensive shapes', () => {
  it('addSibling of an unknown id is a no-op', () => {
    const t0 = fromLinear([m('a')])
    expect(addSibling(t0, 'ghost', m('x'))).toBe(t0)
  })

  it('a stale selection falls back to the newest child', () => {
    const t0 = addSibling(fromLinear([m('a')]), 'a', m('a2'))
    const t1: Thread = { ...t0, selected: { '': 'ghost' } }
    expect(ids(t1)).toEqual(['a2'])
  })

  it('a message missing from the children index is handled everywhere', () => {
    const t: Thread = { byId: { lone: m('lone') }, children: {}, selected: {} }
    expect(selectSibling(t, 'lone', 1)).toBe(t)
    expect(siblingInfo(t, 'lone')).toEqual({ index: 1, count: 1 })
  })
})

describe('thread — updates', () => {
  it('updateMessage patches blocks in place', () => {
    const t0 = fromLinear([m('a')])
    const t1 = updateMessage(t0, 'a', { blocks: [{ type: 'text', text: 'edited' }] })
    const first = visiblePath(t1)[0].blocks[0]
    expect(first.type === 'text' && first.text).toBe('edited')
  })

  it('unknown ids are safe no-ops', () => {
    const t0 = fromLinear([m('a')])
    expect(updateMessage(t0, 'zzz', {})).toBe(t0)
    expect(selectSibling(t0, 'zzz', 1)).toBe(t0)
    expect(siblingInfo(t0, 'zzz')).toEqual({ index: 1, count: 1 })
  })
})
describe('thread — cross-session id collisions (the frozen-app bug)', () => {
  // a session-scoped id counter once collided with persisted ids: appending
  // a message whose id already exists as an ancestor turned the tree into a
  // cycle and visiblePath walked it forever, freezing the app on send
  const corrupted = () => {
    const t = fromLinear([m('f1'), m('f2', 'assistant')])
    return appendToLeaf(t, m('f1', 'user', 'reborn id'))
  }

  it('visiblePath terminates on a cyclic tree instead of freezing', () => {
    const path = visiblePath(corrupted())
    expect(path.length).toBeLessThanOrEqual(2)
  })

  it('sanitizeThread breaks the cycle and keeps a walkable thread', () => {
    const healed = sanitizeThread(corrupted())
    const path = visiblePath(healed).map((x) => x.id)
    expect(path).toEqual(['f1', 'f2'])
    // every surviving edge is reachable and unique
    expect(Object.keys(healed.byId).sort()).toEqual(['f1', 'f2'])
  })

  it('sanitizeThread returns the SAME object for a sound thread', () => {
    const t = fromLinear([m('a'), m('b', 'assistant')])
    expect(sanitizeThread(t)).toBe(t)
  })

  it('sanitizeThreads heals only dirty entries and keeps map identity when clean', () => {
    const clean = { one: fromLinear([m('a')]) }
    expect(sanitizeThreads(clean)).toBe(clean)
    const mixed = { one: fromLinear([m('a')]), two: corrupted() }
    const out = sanitizeThreads(mixed)
    expect(out).not.toBe(mixed)
    expect(out.one).toBe(mixed.one)
    expect(visiblePath(out.two).map((x) => x.id)).toEqual(['f1', 'f2'])
  })

  it('drops selections pointing at pruned ids', () => {
    const t = corrupted()
    const healed = sanitizeThread(t)
    for (const [key, sel] of Object.entries(healed.selected)) {
      expect(healed.children[key]).toContain(sel)
    }
  })
})

describe('thread — hardened walks over broken shapes', () => {
  it('visiblePath skips a child id that has no byId record', () => {
    const t: Thread = {
      byId: { a: m('a') },
      children: { '': ['a'], a: ['ghost'] },
      selected: {},
    }
    expect(visiblePath(t).map((x) => x.id)).toEqual(['a'])
    // sanitize drops the ghost edge and reports a changed object
    const healed = sanitizeThread(t)
    expect(healed).not.toBe(t)
    expect(healed.children.a).toBeUndefined()
  })
})
