import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ChatProxyRequest } from '@nova/shared'
import { callAnthropic, toNovaStream } from './providers/anthropic'

// BE0 skeleton + the provider proxy (BE3 slice pulled forward so real
// credentials can be tested end-to-end). Conventions locked in
// docs/backend-architecture.md: REST /v1, RFC 7807 errors, SSE streaming.

const app = new Hono()

// dev CORS: the Vite client on another port; tighten per-env at deploy time
app.use(
  '/v1/*',
  cors({ origin: (o) => o, allowHeaders: ['content-type'], allowMethods: ['POST', 'OPTIONS'] }),
)

app.get('/healthz', (c) =>
  c.json({
    ok: true,
    service: 'nova-api',
    time: new Date().toISOString(),
  }),
)

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

/** validate the proxy request shape without pulling a schema library yet */
function parseChatRequest(body: unknown): ChatProxyRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const profile = b.profile as Record<string, unknown> | undefined
  const messages = b.messages as unknown[] | undefined
  if (
    b.providerId !== 'claude' ||
    typeof b.model !== 'string' ||
    !b.model ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !profile ||
    (profile.kind !== 'api_key' && profile.kind !== 'account') ||
    typeof profile.credential !== 'string' ||
    !profile.credential.trim()
  )
    return null
  for (const m of messages) {
    const t = m as Record<string, unknown>
    if ((t.role !== 'user' && t.role !== 'assistant') || typeof t.content !== 'string') return null
  }
  return body as ChatProxyRequest
}

app.post('/v1/chat', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return problem(400, 'invalid_json', 'Body must be JSON')
  }
  const req = parseChatRequest(body)
  if (!req)
    return problem(400, 'invalid_request', 'Expected {providerId:"claude", model, messages[], profile{kind, credential}}')

  const upstream = await callAnthropic(req, c.req.raw.signal).catch(() => null)
  if (!upstream) return problem(502, 'upstream_unreachable', 'Could not reach the provider')

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

  return new Response(toNovaStream(upstream.body), {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      // dev CORS for the streamed response (hono/cors covers preflight)
      'access-control-allow-origin': c.req.header('origin') ?? '*',
    },
  })
})

export default app
