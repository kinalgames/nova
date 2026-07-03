// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { diffRecords, fromRecords, toRecords } from './syncmap'
import type { Persisted } from './persist'

const slice: Persisted = {
  theme: 'dark',
  userName: 'Thành',
  projects: [
    { id: 'chung', name: 'Chung', description: '', accent: 'x', isDefault: true, presets: { code: false, design: false, research: false, writing: false, data: false } },
  ],
  conversations: [{ id: 'c1', title: 'Một', projectId: 'chung' }],
  threads: { c1: { byId: {}, children: {}, selected: {} } },
}

describe('syncmap — slice ↔ records', () => {
  it('round-trips a persist slice through records', () => {
    const records = toRecords(slice)
    expect(records.map((r) => `${r.table}:${r.id}`)).toEqual([
      'settings:settings',
      'project:chung',
      'conversation:c1',
      'thread:c1',
    ])
    const back = fromRecords(records)
    expect(back.theme).toBe('dark')
    expect(back.userName).toBe('Thành')
    expect(back.conversations?.[0].title).toBe('Một')
    expect(back.threads?.c1).toEqual(slice.threads?.c1)
    // settings record never smuggles the heavy collections
    const settings = records[0].value as Record<string, unknown>
    expect(settings.projects).toBeUndefined()
    expect(settings.threads).toBeUndefined()
  })

  it('diff emits only changes plus tombstones for removals', () => {
    const prev = toRecords(slice)
    const next = toRecords({
      ...slice,
      conversations: [{ id: 'c2', title: 'Hai', projectId: 'chung' }],
      threads: { c2: { byId: {}, children: {}, selected: {} } },
    })
    const ops = diffRecords(prev, next)
    const puts = ops.filter((o) => o.kind === 'put').map((o) => `${o.table}:${o.id}`)
    const dels = ops.filter((o) => o.kind === 'del').map((o) => `${o.table}:${o.id}`)
    expect(puts).toEqual(['conversation:c2', 'thread:c2'])
    expect(dels).toEqual(['conversation:c1', 'thread:c1'])
  })

  it('an unchanged slice diffs to zero ops', () => {
    expect(diffRecords(toRecords(slice), toRecords({ ...slice }))).toHaveLength(0)
  })

  it('an empty slice maps to just the settings record and back', () => {
    const records = toRecords({})
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ table: 'settings', id: 'settings' })
    const back = fromRecords(records)
    expect(back.projects).toBeUndefined()
    expect(back.conversations).toBeUndefined()
    expect(back.threads).toBeUndefined()
  })
})