// BE3 — /v1/credentials: server-side BYOK. The credential is sealed with
// AES-GCM on write and NEVER returned; the UI works with {id, hint, status}.
// The chat proxy resolves an id back to plaintext in-memory only.

import { Hono } from 'hono'
import { and, asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { providerCredential } from './db/schema'
import { credentialHint, importCredentialsKey, open, seal } from './crypto'
import { createAuth, type AuthEnv } from './auth'
import type { ProviderEnv } from '@nova/ai'

export interface CredentialsEnv extends AuthEnv, ProviderEnv {
  /** base64 32-byte AES key (wrangler secret; .dev.vars locally) */
  CREDENTIALS_KEY: string
}

const PROVIDERS = ['claude', 'gemini', 'openai', 'ollama'] as const
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

// — Gemini OAuth (follow-up to D1's account-kind credential) —
//
// Reuses gemini-cli's OWN public "installed application" OAuth client
// (client_id is not secret per RFC 8252 — Google issues a secret anyway,
// which stays server-side here). The redirect target is a LOOPBACK address
// nothing listens on: Google's installed-app client type accepts any
// localhost/127.0.0.1 port without pre-registration, so the popup simply
// fails to load after the user approves — but the address bar carries
// ?code=... at that point, which the user copies back into Nova. This is
// the exact mechanism `gemini auth login` runs locally; Nova just moves the
// "local server" step to a manual copy-paste since a web app has no
// listener on the user's machine. Verified against gemini-cli's own
// published OAuth traffic (redirect path /oauth2callback, scopes below).
const GEMINI_OAUTH_REDIRECT = 'http://localhost:58219/oauth2callback'
const GEMINI_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

credentials.get('/oauth/gemini/start', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  if (!c.env.GEMINI_OAUTH_CLIENT_ID)
    return problem(500, 'server_misconfigured', 'GEMINI_OAUTH_CLIENT_ID missing')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', c.env.GEMINI_OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', GEMINI_OAUTH_REDIRECT)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GEMINI_OAUTH_SCOPES)
  url.searchParams.set('access_type', 'offline')
  // ALWAYS force fresh consent — otherwise Google omits refresh_token on a
  // repeat authorization, and this manual copy-paste flow has no other
  // signal that the exchange will come back empty-handed
  url.searchParams.set('prompt', 'consent')
  return c.json({ url: url.toString() })
})

credentials.post('/oauth/gemini/exchange', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  if (!c.env.GEMINI_OAUTH_CLIENT_ID || !c.env.GEMINI_OAUTH_CLIENT_SECRET)
    return problem(500, 'server_misconfigured', 'Gemini OAuth client is not configured')
  let body: { code?: string }
  try {
    body = await c.req.json()
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  if (typeof body.code !== 'string' || !body.code.trim())
    return problem(400, 'invalid_request', 'Missing authorization code')
  let res: Response
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: body.code.trim(),
        client_id: c.env.GEMINI_OAUTH_CLIENT_ID,
        client_secret: c.env.GEMINI_OAUTH_CLIENT_SECRET,
        redirect_uri: GEMINI_OAUTH_REDIRECT,
        grant_type: 'authorization_code',
      }).toString(),
    })
  } catch {
    return problem(502, 'upstream_unreachable', 'Could not reach Google')
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return problem(400, 'oauth_exchange_failed', detail.slice(0, 500) || `Google returned ${res.status}`)
  }
  const data = (await res.json().catch(() => ({}))) as { refresh_token?: string }
  if (!data.refresh_token)
    return problem(
      502,
      'no_refresh_token',
      'Google did not return a refresh token — try again (Nova always asks for fresh consent)',
    )
  return c.json({ refreshToken: data.refresh_token })
})

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
