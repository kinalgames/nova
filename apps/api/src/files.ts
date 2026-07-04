// B1 — attachment upload + serving. Bytes live in R2 (ATTACH binding),
// metadata in D1 `attachment` — the D1 row IS the ownership check for both
// serving and vision. Session-gated on every route; rides RL_API like the
// rest of /v1.

import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { attachment } from './db/schema'
import { createAuth, type AuthEnv } from './auth'

export interface FilesEnv extends AuthEnv {
  ATTACH: R2Bucket
  /** HMAC key material for short-lived signed attachment URLs (same secret
   *  the credential vault uses — base64, 32 bytes) */
  CREDENTIALS_KEY: string
}

/** product decision (B1): images ≤5MB (Anthropic's per-image hard cap),
 *  documents ≤10MB, at most 4 attachments per message (enforced client-side
 *  and re-checked when the chat resolves attachments). */
export const IMAGE_MAX = 5 * 1024 * 1024
export const DOC_MAX = 10 * 1024 * 1024

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const DOC_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
])
/** code/text uploads arrive with assorted (or empty) mime strings — classify
 *  by extension exactly like the client's describeUpload does */
const TEXT_EXT = new Set(['txt', 'md', 'csv', 'json', 'py', 'js', 'ts', 'tsx', 'sh'])

const extOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase()

/** the preview family the UI renders — mirrors the client's PreviewKind */
export function kindOf(name: string, mime: string): 'image' | 'pdf' | 'code' | 'csv' | 'md' | null {
  if (IMAGE_MIME.has(mime)) return 'image'
  const ext = extOf(name)
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (ext === 'csv') return 'csv'
  if (ext === 'md') return 'md'
  if (DOC_MIME.has(mime) || TEXT_EXT.has(ext)) return 'code'
  return null
}

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

// — D1/T4.5: short-lived signed GET — providers fetch attachment bytes by URL
// instead of Nova inflating them into base64 request bodies. HMAC-SHA256 over
// `id|exp` with CREDENTIALS_KEY; sessionless by design (providers cannot
// carry one) — possession of a valid, unexpired signature IS the authz, and
// the signature only ever covers ids the owner-checked resolver issued. —

const SIGNED_TTL_S = 15 * 60

async function signingKey(env: FilesEnv): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(env.CREDENTIALS_KEY), (ch) => ch.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hmacHex(env: FilesEnv, payload: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', await signingKey(env), new TextEncoder().encode(payload))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** constant-time hex comparison — a mismatch must not leak WHERE it differs */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** absolute signed URL for an attachment the resolver already owner-checked */
export async function signAttachmentUrl(
  env: FilesEnv,
  id: string,
  origin: string,
  now = Date.now(),
): Promise<string> {
  const exp = Math.floor(now / 1000) + SIGNED_TTL_S
  const sig = await hmacHex(env, `${id}|${exp}`)
  return `${origin}/v1/files/signed/${encodeURIComponent(id)}?exp=${exp}&sig=${sig}`
}

async function userIdOf(env: AuthEnv, req: Request): Promise<string | null> {
  try {
    const session = await createAuth(env).api.getSession({ headers: req.headers })
    return session?.user.id ?? null
  } catch {
    return null
  }
}

export const files = new Hono<{ Bindings: FilesEnv }>()

files.post('/', async (c) => {
  const uid = await userIdOf(c.env, c.req.raw)
  if (!uid) return problem(401, 'unauthenticated', 'Uploading requires a session')

  const name = decodeURIComponent(c.req.header('x-file-name') ?? '').trim()
  if (!name || name.length > 200) return problem(400, 'invalid_name', 'x-file-name is required')
  const mime = (c.req.header('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const kind = kindOf(name, mime)
  if (!kind)
    return problem(415, 'unsupported_type', 'Allowed: png/jpg/webp/gif, pdf, text/code files')

  // bounded read — the caps above keep this far below Worker memory limits
  const bytes = await c.req.arrayBuffer()
  const max = kind === 'image' ? IMAGE_MAX : DOC_MAX
  if (bytes.byteLength === 0) return problem(400, 'empty_file', 'The file has no content')
  if (bytes.byteLength > max)
    return problem(
      413,
      'file_too_large',
      `Max ${max / 1024 / 1024}MB for ${kind === 'image' ? 'images' : 'documents'}`,
    )

  const id = crypto.randomUUID()
  const r2Key = `att/${uid}/${id}`
  await c.env.ATTACH.put(r2Key, bytes, { httpMetadata: { contentType: mime || 'application/octet-stream' } })
  await drizzle(c.env.DB).insert(attachment).values({
    id,
    userId: uid,
    name,
    mime: mime || 'application/octet-stream',
    kind,
    size: bytes.byteLength,
    r2Key,
    createdAt: new Date(),
  })
  return c.json({ id, name, kind, size: bytes.byteLength, mime })
})

// sessionless signed fetch — registered BEFORE '/:id' so the static segment
// wins; every failure is a uniform 404 (no oracle for probing)
files.get('/signed/:id', async (c) => {
  const id = c.req.param('id')
  const exp = Number(c.req.query('exp') ?? '')
  const sig = c.req.query('sig') ?? ''
  if (!Number.isFinite(exp) || exp * 1000 < Date.now())
    return problem(404, 'not_found', 'No such attachment')
  if (!sameHex(sig, await hmacHex(c.env, `${id}|${exp}`)))
    return problem(404, 'not_found', 'No such attachment')
  const rows = await drizzle(c.env.DB)
    .select()
    .from(attachment)
    .where(eq(attachment.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return problem(404, 'not_found', 'No such attachment')
  const obj = await c.env.ATTACH.get(row.r2Key)
  if (!obj) return problem(404, 'not_found', 'No such attachment')
  return new Response(obj.body, {
    headers: {
      'content-type': row.mime,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  })
})

files.get('/:id', async (c) => {
  const uid = await userIdOf(c.env, c.req.raw)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  const row = await loadAttachmentRow(c.env, uid, c.req.param('id'))
  if (!row) return problem(404, 'not_found', 'No such attachment')
  const obj = await c.env.ATTACH.get(row.r2Key)
  if (!obj) return problem(404, 'not_found', 'Attachment content is gone')
  return new Response(obj.body, {
    headers: {
      'content-type': row.mime,
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      'cache-control': 'private, max-age=3600',
      // whitelisted mimes only — and the browser must never second-guess them
      'x-content-type-options': 'nosniff',
      etag: obj.httpEtag,
    },
  })
})

// deleting a conversation client-side also deletes its attachment refs —
// bytes first, then the metadata row (the row is the authz anchor)
files.delete('/:id', async (c) => {
  const uid = await userIdOf(c.env, c.req.raw)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  const row = await loadAttachmentRow(c.env, uid, c.req.param('id'))
  if (!row) return problem(404, 'not_found', 'No such attachment')
  await c.env.ATTACH.delete(row.r2Key)
  await drizzle(c.env.DB)
    .delete(attachment)
    .where(and(eq(attachment.id, row.id), eq(attachment.userId, uid)))
  return c.json({ ok: true })
})

/** owner-checked metadata lookup — shared with the chat's vision resolver */
export async function loadAttachmentRow(
  env: FilesEnv,
  userId: string,
  id: string,
): Promise<typeof attachment.$inferSelect | null> {
  const rows = await drizzle(env.DB)
    .select()
    .from(attachment)
    .where(and(eq(attachment.id, id), eq(attachment.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

/** owner-checked bytes + metadata for the vision resolver */
export async function loadAttachment(
  env: FilesEnv,
  userId: string,
  id: string,
): Promise<{ row: typeof attachment.$inferSelect; bytes: ArrayBuffer } | null> {
  const row = await loadAttachmentRow(env, userId, id)
  if (!row) return null
  const obj = await env.ATTACH.get(row.r2Key)
  if (!obj) return null
  return { row, bytes: await obj.arrayBuffer() }
}
