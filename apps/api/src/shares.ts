// BE4 — public UNLISTED conversation snapshots. The share id is the secret:
// random and unguessable, printed only in the owner's copied link. The
// snapshot is frozen at share time (later messages never leak) and the
// file whitelist is ownership-verified at creation, so the public file
// route can never serve anything the owner did not explicitly share.

import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, inArray } from 'drizzle-orm'
import { attachment, share } from './db/schema'
import { createAuth } from './auth'
import type { FilesEnv } from './files'

const SNAP_KINDS = new Set(['image', 'pdf', 'code', 'csv', 'md'])
const MAX_MESSAGES = 200
const MAX_TEXT = 50_000
const MAX_TOTAL = 500_000

/** one frozen message — built by the client, validated here */
export interface SnapMsg {
  role: 'user' | 'assistant'
  who: string
  text: string
  files?: { fileId?: string; name: string; kind: string }[]
}

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

async function userIdOf(env: FilesEnv, req: Request): Promise<string | null> {
  try {
    const session = await createAuth(env).api.getSession({ headers: req.headers })
    return session?.user.id ?? null
  } catch {
    return null
  }
}

/** unguessable url-safe id — the whole security model of an unlisted link */
function newShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')
}

/** strict shape check; returns the messages or null */
export function parseSnapshot(body: unknown): SnapMsg[] | null {
  const b = body as { messages?: unknown }
  if (!Array.isArray(b?.messages) || b.messages.length === 0) return null
  if (b.messages.length > MAX_MESSAGES) return null
  let total = 0
  const out: SnapMsg[] = []
  for (const raw of b.messages) {
    const m = raw as Record<string, unknown>
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string') return null
    if (typeof m.who !== 'string' || m.who.length > 40) return null
    if (m.text.length > MAX_TEXT) return null
    total += m.text.length
    if (total > MAX_TOTAL) return null
    const files: SnapMsg['files'] = []
    if (m.files !== undefined) {
      if (!Array.isArray(m.files) || m.files.length > 4) return null
      for (const rf of m.files as unknown[]) {
        const f = rf as Record<string, unknown>
        if (typeof f.name !== 'string' || f.name.length > 200) return null
        if (typeof f.kind !== 'string' || !SNAP_KINDS.has(f.kind)) return null
        if (f.fileId !== undefined && typeof f.fileId !== 'string') return null
        files.push({ name: f.name, kind: f.kind, ...(f.fileId ? { fileId: f.fileId } : {}) })
      }
    }
    out.push({ role: m.role, who: m.who, text: m.text, ...(files.length ? { files } : {}) })
  }
  return out
}

export const shares = new Hono<{ Bindings: FilesEnv }>()

shares.post('/', async (c) => {
  const uid = await userIdOf(c.env, c.req.raw)
  if (!uid) return problem(401, 'unauthenticated', 'Sharing requires a session')
  const body = (await c.req.json().catch(() => null)) as {
    convId?: unknown
    title?: unknown
  } | null
  const messages = parseSnapshot(body)
  const title = typeof body?.title === 'string' ? body.title.slice(0, 120) : ''
  const convId = typeof body?.convId === 'string' ? body.convId : ''
  if (!messages || !convId) return problem(400, 'invalid_request', 'Bad share payload')

  // every referenced attachment must belong to the sharer — the public file
  // route trusts this whitelist blindly afterwards
  const fileIds = [...new Set(messages.flatMap((m) => m.files ?? []).flatMap((f) => (f.fileId ? [f.fileId] : [])))]
  if (fileIds.length > 0) {
    const owned = await drizzle(c.env.DB)
      .select({ id: attachment.id })
      .from(attachment)
      .where(and(eq(attachment.userId, uid), inArray(attachment.id, fileIds)))
    if (owned.length !== fileIds.length)
      return problem(400, 'foreign_attachment', 'A referenced attachment is not yours')
  }

  const id = newShareId()
  await drizzle(c.env.DB).insert(share).values({
    id,
    userId: uid,
    convId,
    title: title || 'Untitled',
    snapshot: JSON.stringify(messages),
    fileIds: JSON.stringify(fileIds),
    createdAt: new Date(),
  })
  return c.json({ id })
})

// PUBLIC — the id in the URL is the whole credential (unlisted link)
shares.get('/:id', async (c) => {
  const rows = await drizzle(c.env.DB)
    .select()
    .from(share)
    .where(eq(share.id, c.req.param('id')))
    .limit(1)
  const row = rows[0]
  if (!row) return problem(404, 'not_found', 'This share does not exist or was revoked')
  return c.json({
    title: row.title,
    createdAt: row.createdAt,
    messages: JSON.parse(row.snapshot) as SnapMsg[],
  })
})

// PUBLIC — serves ONLY attachments whitelisted into this share's snapshot
shares.get('/:id/files/:fileId', async (c) => {
  const rows = await drizzle(c.env.DB)
    .select()
    .from(share)
    .where(eq(share.id, c.req.param('id')))
    .limit(1)
  const row = rows[0]
  if (!row) return problem(404, 'not_found', 'This share does not exist or was revoked')
  const fileId = c.req.param('fileId')
  if (!(JSON.parse(row.fileIds) as string[]).includes(fileId))
    return problem(404, 'not_found', 'Not part of this share')
  const metas = await drizzle(c.env.DB)
    .select()
    .from(attachment)
    .where(eq(attachment.id, fileId))
    .limit(1)
  const meta = metas[0]
  if (!meta) return problem(404, 'not_found', 'Attachment content is gone')
  const obj = await c.env.ATTACH.get(meta.r2Key)
  if (!obj) return problem(404, 'not_found', 'Attachment content is gone')
  return new Response(obj.body, {
    headers: {
      'content-type': meta.mime,
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      etag: obj.httpEtag,
    },
  })
})

shares.delete('/:id', async (c) => {
  const uid = await userIdOf(c.env, c.req.raw)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  const res = await drizzle(c.env.DB)
    .delete(share)
    .where(and(eq(share.id, c.req.param('id')), eq(share.userId, uid)))
    .returning({ id: share.id })
  if (res.length === 0) return problem(404, 'not_found', 'No such share')
  return c.json({ ok: true })
})
