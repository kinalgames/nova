// Citations/T8 — favicon proxy for the citation hover preview. Fetching a
// domain's icon directly from a browser <img src> against a third-party
// endpoint means hundreds of millions of users hammer someone else's
// unversioned, un-SLA'd service directly — this route puts OUR OWN cache
// in front of it instead: the upstream absorbs at most one request per
// domain per cache lifetime, everything else is served from the edge.
//
// Sessionless by design (same reasoning as signed attachment URLs in
// files.ts) — an <img> tag cannot carry a bearer token, so this can't be
// gated behind the usual /v1 session check.

import { Hono } from 'hono'

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

// a bare hostname only — no scheme, no path, no userinfo, no port. Rejecting
// anything else keeps this an icon proxy, never an open fetch-anything relay
const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i

const WEEK_S = 60 * 60 * 24 * 7

// a 1×1 transparent PNG — the fallback when the upstream lookup fails, so
// the client's onError hides a real broken-image icon rather than flashing one
const BLANK_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
  (ch) => ch.charCodeAt(0),
)
const blankPngResponse = () =>
  new Response(BLANK_PNG, {
    status: 200,
    headers: { 'content-type': 'image/png', 'cache-control': `public, max-age=${WEEK_S}` },
  })

export const favicon = new Hono()

favicon.get('/', async (c) => {
  const domain = (c.req.query('domain') ?? '').toLowerCase()
  if (!HOSTNAME_RE.test(domain)) return problem(400, 'invalid_domain', 'domain must be a bare hostname')

  const cache = caches.default
  // a stable, collision-free synthetic key — our own cache, not a real fetch
  const cacheKey = new Request(`https://nova-favicon-cache.internal/${encodeURIComponent(domain)}`)
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let upstream: Response
  try {
    upstream = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`)
  } catch {
    return blankPngResponse()
  }
  if (!upstream.ok || !upstream.body) return blankPngResponse()

  const res = new Response(upstream.body, upstream)
  res.headers.set('content-type', upstream.headers.get('content-type') ?? 'image/png')
  res.headers.set('cache-control', `public, max-age=${WEEK_S}, immutable`)
  res.headers.delete('set-cookie')
  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()))
  return res
})
