// Per-user Durable Object — the durable side of the op-log sync (BE2).
// SQLite-backed: one row per record with a monotonically increasing seq;
// deletions are tombstones so a `since` pull carries them as ops. Message
// trees ride as whole `thread` records in v1 — native clients can granularize
// to per-message ops later without changing the envelope.

import { DurableObject } from 'cloudflare:workers'
import type { SyncOp, SyncPullResponse, SyncTable } from '@nova/shared'

const TABLES: SyncTable[] = ['settings', 'project', 'conversation', 'thread']

export class UserStore extends DurableObject {
  private ensured = false

  private ensure() {
    if (this.ensured) return
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS records (
         tbl TEXT NOT NULL,
         id TEXT NOT NULL,
         value TEXT,
         deleted INTEGER NOT NULL DEFAULT 0,
         at INTEGER NOT NULL,
         seq INTEGER NOT NULL,
         PRIMARY KEY (tbl, id)
       )`,
    )
    this.ensured = true
  }

  private nextSeq(): number {
    const row = this.ctx.storage.sql
      .exec('SELECT COALESCE(MAX(seq), 0) AS s FROM records')
      .one() as { s: number }
    return row.s + 1
  }

  /** apply a batch of ops; returns the new head seq */
  apply(ops: SyncOp[]): number {
    this.ensure()
    let seq = this.nextSeq()
    for (const op of ops) {
      this.ctx.storage.sql.exec(
        `INSERT INTO records (tbl, id, value, deleted, at, seq)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(tbl, id) DO UPDATE SET
           value = excluded.value, deleted = excluded.deleted,
           at = excluded.at, seq = excluded.seq`,
        op.table,
        op.id,
        op.kind === 'put' ? JSON.stringify(op.value ?? null) : null,
        op.kind === 'del' ? 1 : 0,
        op.at,
        seq++,
      )
    }
    return seq - 1
  }

  /** every record change after `since`, oldest first, plus the head seq */
  pull(since: number): SyncPullResponse {
    this.ensure()
    const rows = this.ctx.storage.sql
      .exec(
        'SELECT tbl, id, value, deleted, at, seq FROM records WHERE seq > ? ORDER BY seq ASC',
        since,
      )
      .toArray() as { tbl: string; id: string; value: string | null; deleted: number; at: number; seq: number }[]
    const head = rows.length ? rows[rows.length - 1].seq : this.headSeq()
    return {
      seq: head,
      ops: rows.map((r) => ({
        kind: r.deleted ? 'del' : 'put',
        table: r.tbl as SyncTable,
        id: r.id,
        ...(r.deleted ? {} : { value: r.value ? (JSON.parse(r.value) as unknown) : null }),
        at: r.at,
      })),
    }
  }

  private headSeq(): number {
    const row = this.ctx.storage.sql
      .exec('SELECT COALESCE(MAX(seq), 0) AS s FROM records')
      .one() as { s: number }
    return row.s
  }

  /** internal HTTP surface consumed by the Worker routes */
  override async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'GET' && url.pathname === '/ops') {
      const since = Number(url.searchParams.get('since') ?? '0') || 0
      return Response.json(this.pull(since))
    }
    if (req.method === 'POST' && url.pathname === '/ops') {
      const body = (await req.json()) as { ops?: SyncOp[] }
      const ops = (body.ops ?? []).filter(
        (o) =>
          (o.kind === 'put' || o.kind === 'del') &&
          TABLES.includes(o.table) &&
          typeof o.id === 'string' &&
          o.id.length > 0,
      )
      return Response.json({ seq: this.apply(ops) })
    }
    return new Response('not found', { status: 404 })
  }
}
