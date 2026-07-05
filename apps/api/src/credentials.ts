// BE3 — /v1/credentials: server-side BYOK. The credential is sealed with
// AES-GCM on write and NEVER returned; the UI works with {id, hint, status}.
// The chat proxy resolves an id back to plaintext in-memory only.

import { Hono } from 'hono'
import { and, asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { providerCredential } from './db/schema'
import { credentialHint, importCredentialsKey, open, seal } from './crypto'
import { createAuth, type AuthEnv } from './auth'

export interface CredentialsEnv extends AuthEnv {
  /** base64 32-byte AES key (wrangler secret; .dev.vars locally) */
  CREDENTIALS_KEY: string
}

const PROVIDERS = ['claude', 'gemini', 'openai', 'ollama'] as const
// 'account' stays valid for Claude (Claude Code setup-token). Gemini's own
// account-kind (Google OAuth → Code Assist) was RETIRED 2026-07-05: Google
// sunset consumer-tier Code Assist access 2026-06-18, and separately bans
// third-party reuse of gemini-cli's OAuth client as a ToS violation (real
// accounts have been suspended for exactly this pattern) — see
// packages/shared/src/contracts.ts for the full rationale.
const KINDS = ['api_key', 'account'] as const
const STATUSES = ['active', 'limited', 'error', 'untested'] as const

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

/** the row shape the client sees — no ciphertext, no plaintext, ever */
const masked = (r: typeof providerCredential.$inferSelect) => ({
  id: r.id,
  providerId: r.providerId,
  kind: r.kind,
  name: r.name,
  hint: r.hint,
  status: r.status,
  priority: r.priority,
})

export const credentials = new Hono<{ Bindings: CredentialsEnv }>()

async function requireUser(c: { env: CredentialsEnv; req: { raw: Request } }) {
  try {
    const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
    return session?.user.id ?? null
  } catch {
    // fail CLOSED: an auth-backend hiccup is "no session", never a 500
    return null
  }
}

credentials.get('/', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  const db = drizzle(c.env.DB)
  const rows = await db
    .select()
    .from(providerCredential)
    .where(eq(providerCredential.userId, uid))
    .orderBy(asc(providerCredential.providerId), asc(providerCredential.priority))
  return c.json({ credentials: rows.map(masked) })
})

credentials.post('/', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  if (!c.env.CREDENTIALS_KEY) return problem(500, 'server_misconfigured', 'CREDENTIALS_KEY missing')
  let body: { providerId?: string; kind?: string; name?: string; credential?: string }
  try {
    body = await c.req.json()
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  if (
    !PROVIDERS.includes(body.providerId as (typeof PROVIDERS)[number]) ||
    !KINDS.includes(body.kind as (typeof KINDS)[number]) ||
    typeof body.credential !== 'string' ||
    !body.credential.trim()
  )
    return problem(400, 'invalid_request', 'Expected {providerId, kind, credential, name?}')

  const key = await importCredentialsKey(c.env.CREDENTIALS_KEY)
  const sealed = await seal(key, body.credential.trim())
  const now = new Date()
  const row: typeof providerCredential.$inferInsert = {
    id: crypto.randomUUID(),
    userId: uid,
    providerId: body.providerId as string,
    kind: body.kind as string,
    name: (body.name ?? '').trim() || 'default',
    credentialIv: sealed.iv,
    credentialCt: sealed.ct,
    hint: credentialHint(body.credential.trim()),
    status: 'untested',
    priority: Date.now(), // append to the end of the rotation order
    createdAt: now,
    updatedAt: now,
  }
  const db = drizzle(c.env.DB)
  await db.insert(providerCredential).values(row)
  return c.json({ credential: masked(row as typeof providerCredential.$inferSelect) }, 201)
})

credentials.patch('/:id', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  let body: { name?: string; status?: string; priority?: number }
  try {
    body = await c.req.json()
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  if (body.status && !STATUSES.includes(body.status as (typeof STATUSES)[number]))
    return problem(400, 'invalid_request', 'Unknown status')
  const patch: Partial<typeof providerCredential.$inferInsert> = { updatedAt: new Date() }
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (body.status) patch.status = body.status
  if (typeof body.priority === 'number') patch.priority = body.priority
  const db = drizzle(c.env.DB)
  const rows = await db
    .update(providerCredential)
    .set(patch)
    .where(and(eq(providerCredential.id, c.req.param('id')), eq(providerCredential.userId, uid)))
    .returning()
  if (rows.length === 0) return problem(404, 'not_found', 'No such credential')
  return c.json({ credential: masked(rows[0]) })
})

credentials.delete('/:id', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  const db = drizzle(c.env.DB)
  const rows = await db
    .delete(providerCredential)
    .where(and(eq(providerCredential.id, c.req.param('id')), eq(providerCredential.userId, uid)))
    .returning()
  if (rows.length === 0) return problem(404, 'not_found', 'No such credential')
  return c.json({ ok: true })
})

/** resolve an owned credential id to PLAINTEXT — chat-proxy internal only */
export async function openCredential(
  env: CredentialsEnv,
  userId: string,
  credentialId: string,
): Promise<{ providerId: string; kind: string; credential: string } | null> {
  const db = drizzle(env.DB)
  const rows = await db
    .select()
    .from(providerCredential)
    .where(and(eq(providerCredential.id, credentialId), eq(providerCredential.userId, userId)))
  const row = rows[0]
  if (!row) return null
  const key = await importCredentialsKey(env.CREDENTIALS_KEY)
  try {
    const credential = await open(key, { iv: row.credentialIv, ct: row.credentialCt })
    return { providerId: row.providerId, kind: row.kind, credential }
  } catch {
    // wrong key epoch or corrupted row — treat as absent, never crash the chat
    return null
  }
}
