import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { account, user } from './db/schema'
import type { ChatProxyRequest, ProfileKind } from '@nova/shared'
import {
  ProviderConfigError,
  isProviderId,
  providerAdapters,
  providerKinds,
  type ProviderEnv,
  agenticStream,
} from '@nova/ai'
import { filesTool, makeFilesExecutor } from './toolbox'
import { createAuth } from './auth'
import { limitAuth, limitV1, type RateLimitEnv } from './ratelimit'
import { credentials, openCredential, type CredentialsEnv } from './credentials'
import { listOllamaModels, pullOllamaModel } from './ollama-catalog'
import { files } from './files'
import { shares } from './shares'
import { resolveAttachments } from './attachments'
import { favicon } from './favicon'
import { tapNovaUsage, usage, type UsageEnv } from './usage'
import type { MailEnv } from './mail'
import type { SyncOp } from '@nova/shared'

export { UserStore } from './do/userStore'

export interface Env extends CredentialsEnv, ProviderEnv, UsageEnv, RateLimitEnv, MailEnv {
  USER_STORE: DurableObjectNamespace
  /** B1 — attachment bytes (metadata in D1 `attachment`) */
  ATTACH: R2Bucket
}

// BE1 auth (Better Auth on D1) + the provider proxy (BE3 slice pulled
// forward). Conventions locked in docs/backend-architecture.md: REST /v1,
// RFC 7807 errors, SSE streaming.

const app = new Hono<{ Bindings: Env; Variables: { requestId: string } }>()

// B4 — request correlation + structured request logs. cf-ray is already
// unique per edge request; local dev falls back to a UUID. The id rides on
// EVERY response as x-request-id — the client surfaces it in error cards so
// a user report can be matched to these log lines.
app.use('*', async (c, next) => {
  const requestId = c.req.header('cf-ray') ?? crypto.randomUUID()
  c.set('requestId', requestId)
  const t0 = Date.now()
  await next()
  c.res.headers.set('x-request-id', requestId)
  if (c.req.path !== '/healthz')
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'req',
        id: requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Date.now() - t0,
      }),
    )
})

// dev CORS: the Vite client on another port; tighten per-env at deploy time.
// credentials:true → origin must be reflected, never '*'.
app.use(
  '/v1/*',
  cors({
    origin: (o) => o,
    credentials: true,
    allowHeaders: ['content-type', 'authorization', 'x-file-name'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    // cross-origin dev must be able to READ these (same-origin always can):
    // retry-after drives the client back-off, x-request-id the error card
    exposeHeaders: ['x-request-id', 'retry-after'],
  }),
)
app.use(
  '/api/auth/*',
  cors({
    origin: (o) => o,
    credentials: true,
    allowHeaders: ['content-type', 'authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
)

// B3: layer-1 abuse shields — registered AFTER cors so CORS preflights are
// answered before they can burn rate-limit budget (see ratelimit.ts)
app.use('/v1/*', limitV1)
app.use('/api/auth/*', limitAuth)

// Better Auth owns everything under /api/auth/* (per-request instance —
// isolates are reused, module state would leak across requests)
app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

/** resolve the session; an auth-backend hiccup is "no session", never a 500 */
async function sessionOf(c: { env: Env; req: { raw: Request } }) {
  try {
    return await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  } catch {
    return null
  }
}

/** the public shape of an account — secrets and auth internals never leave */
const meShape = (u: { id: string; name: string; email: string; emailVerified?: boolean }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  assistantName: (u as { assistantName?: string | null }).assistantName ?? null,
  // D5 — the web app shows a soft verify nudge when this is false
  emailVerified: u.emailVerified ?? false,
})

// session probe — works with the web session cookie OR a bearer token
app.get('/v1/me', async (c) => {
  const session = await sessionOf(c)
  if (!session) return problem(401, 'unauthenticated', 'No valid session')
  // D4 — social-only accounts carry no password credential; the client
  // hides the change-password form for them
  let hasPassword = false
  try {
    const rows = await drizzle(c.env.DB)
      .select({ p: account.providerId })
      .from(account)
      .where(eq(account.userId, session.user.id))
    hasPassword = rows.some((r) => r.p === 'credential')
  } catch {
    // no D1 in the unit harness — the probe stays usable either way
  }
  return c.json({ user: { ...meShape(session.user), hasPassword } })
})

// D4 — full account deletion: R2 attachment bytes, the sync op-log in the
// user's Durable Object, then the D1 user row (FK cascade removes sessions,
// oauth accounts, sealed credentials and attachment metadata). Irreversible.
app.delete('/v1/me', async (c) => {
  const session = await sessionOf(c)
  if (!session) return problem(401, 'unauthenticated', 'No valid session')
  const uid = session.user.id
  let cursor: string | undefined
  do {
    const listed = await c.env.ATTACH.list({ prefix: `att/${uid}/`, cursor })
    if (listed.objects.length) await c.env.ATTACH.delete(listed.objects.map((o) => o.key))
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
  await userStub(c.env, uid).fetch('https://do/wipe', { method: 'POST' })
  await drizzle(c.env.DB).delete(user).where(eq(user.id, uid))
  console.log(JSON.stringify({ level: 'info', msg: 'account_deleted', id: c.get('requestId'), uid }))
  return c.json({ ok: true })
})

// Track D: persists the assistant's name onto the account. The column doubles
// as the "onboarding completed" marker that social sign-ins check — a null
// assistantName routes the first OAuth login through /onboarding.
app.patch('/v1/me', async (c) => {
  const session = await sessionOf(c)
  if (!session) return problem(401, 'unauthenticated', 'No valid session')
  const body = (await c.req.json().catch(() => null)) as { assistantName?: unknown } | null
  const name = typeof body?.assistantName === 'string' ? body.assistantName.trim() : ''
  if (name.length === 0 || name.length > 60)
    return problem(400, 'invalid_assistant_name', 'assistantName must be 1-60 characters')
  await drizzle(c.env.DB)
    .update(user)
    .set({ assistantName: name, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))
  return c.json({ user: { ...meShape(session.user), assistantName: name } })
})

// Social OAuth lands with a session COOKIE only (the redirect cannot deliver
// the set-auth-token header) — this endpoint exchanges that cookie for the
// bearer token the client architecture runs on. The bearer plugin accepts the
// raw session token, which is exactly what sign-in's set-auth-token carries.
app.get('/v1/session-token', async (c) => {
  const token = (await sessionOf(c))?.session.token ?? null
  if (!token) return problem(401, 'unauthenticated', 'No valid session')
  return c.json({ token })
})

// BE3: sealed BYOK CRUD (session-gated; secrets never round-trip)
app.route('/v1/credentials', credentials)

// T8: month usage roll-up read-back (session-gated; AE SQL API)
app.route('/v1/usage', usage)

// B1: attachment upload + owner-checked serving (bytes in R2)
app.route('/v1/files', files)

// BE4: public unlisted conversation snapshots (create/revoke need a session)
app.route('/v1/shares', shares)

// Citations/T8: favicon proxy for the citation hover preview (sessionless
// — an <img> tag cannot carry a bearer token; see favicon.ts)
app.route('/v1/favicon', favicon)

app.get('/healthz', (c) =>
  c.json({
    ok: true,
    service: 'nova-api',
    time: new Date().toISOString(),
  }),
)

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

/** validate the proxy request shape without pulling a schema library yet.
 *  Exactly one credential source: a stored credentialId OR an inline profile,
 *  and the credential kind must be one the provider actually supports. */
function parseChatRequest(body: unknown): ChatProxyRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (!isProviderId(b.providerId)) return null
  const profile = b.profile as Record<string, unknown> | undefined
  const messages = b.messages as unknown[] | undefined
  const hasStored = typeof b.credentialId === 'string' && b.credentialId.trim() !== ''
  const hasInline =
    !!profile &&
    (providerKinds[b.providerId] as readonly string[]).includes(profile.kind as string) &&
    typeof profile.credential === 'string' &&
    profile.credential.trim() !== ''
  if (
    typeof b.model !== 'string' ||
    !b.model ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    hasStored === hasInline || // exactly one source
    (b.thinking !== undefined &&
      !['off', 'low', 'normal', 'high'].includes(b.thinking as string)) ||
    (b.search !== undefined && typeof b.search !== 'boolean') ||
    (b.fetch !== undefined && typeof b.fetch !== 'boolean') ||
    (b.files !== undefined && typeof b.files !== 'boolean')
  )
    return null
  for (const m of messages) {
    const t = m as Record<string, unknown>
    if ((t.role !== 'user' && t.role !== 'assistant') || typeof t.content !== 'string') return null
    // B1 — attachment refs: optional, ≤4 per turn, each an { id: string }
    if (t.attachments !== undefined) {
      if (!Array.isArray(t.attachments) || t.attachments.length > 4) return null
      for (const a of t.attachments as unknown[])
        if (typeof (a as { id?: unknown })?.id !== 'string') return null
    }
  }
  return body as ChatProxyRequest
}

// — BE2: per-user op-log sync —
async function userIdOf(c: { env: Env; req: { raw: Request } }): Promise<string | null> {
  return (await sessionOf(c))?.user.id ?? null
}

const userStub = (env: Env, userId: string) =>
  env.USER_STORE.get(env.USER_STORE.idFromName(userId))

app.get('/v1/sync', async (c) => {
  const uid = await userIdOf(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  const since = Number(c.req.query('since') ?? '0') || 0
  const res = await userStub(c.env, uid).fetch(`https://do/ops?since=${since}`)
  return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json' } })
})

app.post('/v1/sync', async (c) => {
  const uid = await userIdOf(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  let body: { ops?: SyncOp[]; src?: string }
  try {
    body = (await c.req.json()) as { ops?: SyncOp[]; src?: string }
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  if (!Array.isArray(body.ops)) return problem(400, 'invalid_request', 'Expected {ops: SyncOp[]}')
  const res = await userStub(c.env, uid).fetch('https://do/ops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ops: body.ops,
      ...(typeof body.src === 'string' ? { src: body.src.slice(0, 32) } : {}),
    }),
  })
  return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json' } })
})

// B7 — live sync socket. Browsers cannot set an Authorization header on a
// WebSocket, so the bearer rides the subprotocol list:
//   new WebSocket(url, ['nova-sync', token])
// We validate it here, then hand the upgrade to the user's Durable Object
// (hibernation-friendly: idle sockets cost nothing).
app.get('/v1/sync/ws', async (c) => {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket')
    return problem(426, 'upgrade_required', 'This endpoint speaks WebSocket')
  const protos = (c.req.header('sec-websocket-protocol') ?? '').split(',').map((s) => s.trim())
  // the bearer arrives base64url-encoded: raw tokens can carry characters
  // that are ILLEGAL in a subprotocol entry (browsers refuse to even send)
  let token: string | null = null
  if (protos[0] === 'nova-sync' && protos[1]) {
    try {
      const b64 = protos[1].replace(/-/g, '+').replace(/_/g, '/')
      token = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    } catch {
      token = null
    }
  }
  if (!token) return problem(401, 'unauthenticated', 'Missing sync token')
  const session = await createAuth(c.env)
    .api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) })
    .catch(() => null)
  const uid = session?.user.id
  if (!uid) return problem(401, 'unauthenticated', 'Invalid sync token')
  return userStub(c.env, uid).fetch(new Request('https://do/ws', c.req.raw))
})

/** B6c — resolve the ollama endpoint from exactly one credential source */
async function ollamaEndpointOf(
  c: { env: Env; req: { raw: Request; json: () => Promise<unknown> } },
  uid: string,
  body: { credentialId?: unknown; endpoint?: unknown },
): Promise<{ endpoint: string } | { error: Response }> {
  const hasStored = typeof body.credentialId === 'string' && body.credentialId.trim() !== ''
  const hasInline = typeof body.endpoint === 'string' && body.endpoint.trim() !== ''
  if (hasStored === hasInline)
    return { error: problem(400, 'invalid_request', 'Expected exactly one of credentialId | endpoint') }
  if (hasStored) {
    const stored = await openCredential(c.env, uid, body.credentialId as string)
    if (!stored) return { error: problem(404, 'credential_not_found', 'No such stored credential') }
    if (stored.providerId !== 'ollama')
      return { error: problem(400, 'credential_mismatch', 'Credential belongs to another provider') }
    return { endpoint: stored.credential }
  }
  return { endpoint: body.endpoint as string }
}

// B6c — the models the user's ollama endpoint actually serves (real caps)
app.post('/v1/ollama/models', async (c) => {
  const uid = await userIdOf(c)
  if (!uid) return problem(401, 'unauthenticated', 'Requires a signed-in session')
  let body: { credentialId?: unknown; endpoint?: unknown }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  const src = await ollamaEndpointOf(c, uid, body)
  if ('error' in src) return src.error
  let rows
  try {
    rows = await listOllamaModels(src.endpoint)
  } catch (e) {
    return problem(400, 'invalid_endpoint', String((e as Error).message ?? e).slice(0, 200))
  }
  if (rows === null)
    return problem(502, 'ollama_unreachable', 'The ollama endpoint did not answer /api/tags')
  return c.json({ models: rows })
})

// B6c — pull a new model onto the endpoint; progress streams back as SSE
app.post('/v1/ollama/pull', async (c) => {
  const uid = await userIdOf(c)
  if (!uid) return problem(401, 'unauthenticated', 'Requires a signed-in session')
  let body: { credentialId?: unknown; endpoint?: unknown; model?: unknown }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  const model = typeof body.model === 'string' ? body.model.trim() : ''
  if (!model || model.length > 200) return problem(400, 'invalid_request', 'Missing model name')
  const src = await ollamaEndpointOf(c, uid, body)
  if ('error' in src) return src.error
  console.log(JSON.stringify({ level: 'info', msg: 'ollama_pull', id: c.get('requestId'), uid, model }))
  try {
    return await pullOllamaModel(src.endpoint, model)
  } catch (e) {
    return problem(400, 'invalid_endpoint', String((e as Error).message ?? e).slice(0, 200))
  }
})

app.post('/v1/chat', async (c) => {
  // B3: chat REQUIRES a session — the relay must never be an anonymous
  // proxy for arbitrary provider traffic
  const uid = await userIdOf(c)
  if (!uid) return problem(401, 'unauthenticated', 'Chat requires a signed-in session')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  const req = parseChatRequest(body)
  if (!req)
    return problem(
      400,
      'invalid_request',
      'Expected {providerId, model, messages[], credentialId | profile{kind, credential}} with a kind the provider supports',
    )

  // BE3: resolve a stored credential — unsealed in memory only
  if (req.credentialId) {
    const stored = await openCredential(c.env, uid, req.credentialId)
    if (!stored) return problem(404, 'credential_not_found', 'No such stored credential')
    if (stored.providerId !== req.providerId)
      return problem(400, 'credential_mismatch', 'Credential belongs to another provider')
    if (!(providerKinds[req.providerId] as readonly string[]).includes(stored.kind))
      return problem(400, 'credential_mismatch', 'Credential kind not supported by this provider')
    req.profile = { kind: stored.kind as ProfileKind, credential: stored.credential }
  }
  const profile = req.profile
  if (!profile) return problem(400, 'invalid_request', 'Missing credential source')

  // B1 — resolve attachment refs (owner-checked) into provider-ready parts;
  // text files fold into the turn text, binaries become adapter parts — by
  // signed URL where the provider can fetch (T4.5), inline base64 otherwise
  const messages = await resolveAttachments(c.env, uid, req.messages, {
    providerId: req.providerId,
    // optional chain: hono's c.env is undefined under app.request without env
    publicOrigin: (c.env as Env | undefined)?.BETTER_AUTH_URL,
  })

  const adapter = providerAdapters[req.providerId]

  // T5 — the files tool flips the request into the bounded agentic loop:
  // several provider rounds stream through ONE client response
  if (req.files) {
    let novaStream = agenticStream(
      adapter,
      { ...req, profile, messages, novaTools: [filesTool] },
      makeFilesExecutor(c.env, uid),
      c.req.raw.signal,
      c.env,
    )
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'chat',
        id: c.get('requestId'),
        providerId: req.providerId,
        model: req.model,
        agentic: true,
        uid,
      }),
    )
    const ds = (c.env as Env | undefined)?.USAGE
    if (ds)
      novaStream = tapNovaUsage(novaStream, (u) =>
        ds.writeDataPoint({
          blobs: [req.providerId, req.model, profile.kind],
          doubles: [u.inputTokens, u.outputTokens],
          indexes: [uid],
        }),
      )
    return new Response(novaStream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  let upstream: Response
  try {
    upstream = await adapter.call({ ...req, profile, messages }, c.req.raw.signal, c.env)
  } catch (e) {
    // a credential that cannot possibly work is the caller's error, not a 502
    if (e instanceof ProviderConfigError) return problem(400, 'invalid_credential', e.message)
    return problem(502, 'upstream_unreachable', 'Could not reach the provider')
  }

  // B4 — one structured line per chat call: routing + outcome, never content
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'chat',
      id: c.get('requestId'),
      providerId: req.providerId,
      model: req.model,
      status: upstream.status,
      uid,
      thinking: req.thinking ?? null,
      attachments: req.messages.reduce((n, m) => n + (m.attachments?.length ?? 0), 0),
    }),
  )

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    const retryAfter = upstream.headers.get('retry-after')
    return Response.json(
      {
        type: 'about:blank',
        status: upstream.status,
        code: upstream.status === 429 ? 'rate_limited' : 'upstream_error',
        detail: detail.slice(0, 2000),
      },
      {
        status: upstream.status,
        headers: retryAfter ? { 'retry-after': retryAfter } : undefined,
      },
    )
  }

  if (!upstream.body) return problem(502, 'upstream_empty', 'Provider returned no stream')

  // T8: meter the reply — one AE datapoint per message_stop, attributed to
  // the session user (every chat carries a session since B3)
  let novaStream = adapter.stream(upstream.body)
  // optional chain: hono's c.env is undefined under app.request without env
  const dataset = (c.env as Env | undefined)?.USAGE
  if (dataset) {
    novaStream = tapNovaUsage(novaStream, (u) =>
      dataset.writeDataPoint({
        blobs: [req.providerId, req.model, profile.kind],
        doubles: [u.inputTokens, u.outputTokens],
        indexes: [uid],
      }),
    )
  }

  return new Response(novaStream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      // dev CORS for the streamed response (hono/cors covers preflight)
      'access-control-allow-origin': c.req.header('origin') ?? '*',
    },
  })
})

export default app
