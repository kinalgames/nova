// Pure mapping between the persisted store slice and sync records (BE2).
// Record granularity: settings singleton · project:<id> · conversation:<id> ·
// thread:<convId>. Whole-thread values in v1 (see docs/backend-architecture).

import type { SyncOp, SyncTable } from '@nova/shared'
import type { Persisted } from './persist'

export interface SyncRecord {
  table: SyncTable
  id: string
  value: unknown
}

const keyOf = (r: { table: string; id: string }) => `${r.table}:${r.id}`

/** flatten a persist slice into sync records */
export function toRecords(p: Persisted): SyncRecord[] {
  const { projects, conversations, threads, ...settings } = p
  const out: SyncRecord[] = [{ table: 'settings', id: 'settings', value: settings }]
  for (const pr of projects ?? []) out.push({ table: 'project', id: pr.id, value: pr })
  for (const c of conversations ?? []) out.push({ table: 'conversation', id: c.id, value: c })
  for (const [id, th] of Object.entries(threads ?? {}))
    out.push({ table: 'thread', id, value: th })
  return out
}

/** rebuild a persist slice from pulled records (server order preserved) */
export function fromRecords(records: SyncRecord[]): Persisted {
  const p: Persisted = {}
  const projects: NonNullable<Persisted['projects']> = []
  const conversations: NonNullable<Persisted['conversations']> = []
  const threads: NonNullable<Persisted['threads']> = {}
  for (const r of records) {
    if (r.table === 'settings') Object.assign(p, r.value as Persisted)
    else if (r.table === 'project') projects.push(r.value as (typeof projects)[number])
    else if (r.table === 'conversation')
      conversations.push(r.value as (typeof conversations)[number])
    else if (r.table === 'thread') threads[r.id] = r.value as (typeof threads)[string]
  }
  if (projects.length) p.projects = projects
  if (conversations.length) p.conversations = conversations
  if (Object.keys(threads).length) p.threads = threads
  return p
}

/** diff two record sets into ops: changed/added puts + tombstone dels */
export function diffRecords(prev: SyncRecord[], next: SyncRecord[]): SyncOp[] {
  const at = Date.now()
  const prevMap = new Map(prev.map((r) => [keyOf(r), JSON.stringify(r.value)]))
  const ops: SyncOp[] = []
  const seen = new Set<string>()
  for (const r of next) {
    const k = keyOf(r)
    seen.add(k)
    if (prevMap.get(k) !== JSON.stringify(r.value))
      ops.push({ kind: 'put', table: r.table, id: r.id, value: r.value, at })
  }
  for (const r of prev) {
    const k = keyOf(r)
    if (!seen.has(k)) ops.push({ kind: 'del', table: r.table, id: r.id, at })
  }
  return ops
}
