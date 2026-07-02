import { Hono } from 'hono'

// BE0 skeleton — routes arrive with BE1 (auth) and BE2 (sync/CRUD).
// Conventions locked in docs/backend-architecture.md: REST /v1, RFC 7807
// errors with `code` + `request_id`, cursor pagination, SSE chat streaming.

const app = new Hono()

app.get('/healthz', (c) =>
  c.json({
    ok: true,
    service: 'nova-api',
    time: new Date().toISOString(),
  }),
)

export default app
