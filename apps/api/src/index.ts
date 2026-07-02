import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ChatProxyRequest, ProfileKind } from '@nova/shared'
import {
  ProviderConfigError,
  isProviderId,
  providerAdapters,
  providerKinds,
  type ProviderEnv,
} from './providers'
import { createAuth } from './auth'
import { credentials, openCredential, type CredentialsEnv } from './credentials'
import { tapNovaUsage, usage, type UsageEnv } from './usage'
import type { SyncOp } from '@nova/shared'

export { UserStore } from './do/userStore'

interface Env extends CredentialsEnv, ProviderEnv, UsageEnv {
  USER_STORE: DurableObjectNamespace
}

// BE1 auth (Better Auth on D1) + the provider proxy (BE3 slice pulled
// forward). Conventions locked in docs/backend-architecture.md: REST /v1,
// RFC 7807 errors, SSE streaming.

const app = new Hono<{ Bindings: Env }>()

// dev CORS: the Vite client on another port; tighten per-env at deploy time.
// credentials:true → origin must be reflected, never '*'.
app.use(
  '/v1/*',
  cors({
    origin: (o) => o,
    credentials: true,
    allowHeaders: ['content-type', 'authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
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

// Better Auth owns everything under /api/auth/* (per-request instance —
// isolates are reused, module state would leak across requests)
app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

// session probe — works with the web session cookie OR a bearer token
app.get('/v1/me', async (c) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  if (!session) return problem(401, 'unauthenticated', 'No valid session')
  return c.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      assistantName:
        (session.user as { assistantName?: string | null }).assistantName ?? null,
    },
  })
})

// BE3: sealed BYOK CRUD (session-gated; secrets never round-trip)
app.route('/v1/credentials', credentials)

// T8: month usage roll-up read-back (session-gated; AE SQL API)
app.route('/v1/usage', usage)

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
    hasStored === hasInline // exactly one source
  )
    return null
  for (const m of messages) {
    const t = m as Record<string, unknown>
    if ((t.role !== 'user' && t.role !== 'assistant') || typeof t.content !== 'string') return null
  }
  return body as ChatProxyRequest
}

// — BE2: per-user op-log sync —
async function userIdOf(c: { env: Env; req: { raw: Request } }): Promise<string | null> {
  try {
    const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
    return session?.user.id ?? null
  } catch {
    // fail CLOSED: an auth-backend hiccup is "no session", never a 500
    return null
  }
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
  let body: { ops?: SyncOp[] }
  try {
    body = (await c.req.json()) as { ops?: SyncOp[] }
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  if (!Array.isArray(body.ops)) return problem(400, 'invalid_request', 'Expected {ops: SyncOp[]}')
  const res = await userStub(c.env, uid).fetch('https://do/ops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ops: body.ops }),
  })
  return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json' } })
})

app.post('/v1/chat', async (c) => {
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

  // one session probe serves both credential resolution and usage metering
  const uid = await userIdOf(c)

  // BE3: resolve a stored credential — session-gated, unsealed in memory only
  if (req.credentialId) {
    if (!uid) return problem(401, 'unauthenticated', 'A stored credential needs a session')
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

  const adapter = providerAdapters[req.providerId]
  let upstream: Response
  try {
    upstream = await adapter.call({ ...req, profile }, c.req.raw.signal, c.env)
  } catch (e) {
    // a credential that cannot possibly work is the caller's error, not a 502
    if (e instanceof ProviderConfigError) return problem(400, 'invalid_credential', e.message)
    return problem(502, 'upstream_unreachable', 'Could not reach the provider')
  }

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
  // the session user (unattributable anonymous chats are not metered)
  let novaStream = adapter.stream(upstream.body)
  // optional chain: hono's c.env is undefined under app.request without env
  const dataset = (c.env as Env | undefined)?.USAGE
  if (uid && dataset) {
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
