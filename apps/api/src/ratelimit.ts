// B3 — layer-1 abuse shields on the Workers Rate Limiting binding (GA).
// Counters are approximate and PER-COLO: the right tool for brute-force and
// spam shielding, NOT for precise per-user quotas (that becomes a Durable
// Object counter when billing arrives). Keys are client IPs on purpose —
// keying by user would cost an extra session lookup on every request, and
// per-IP already covers the abuse patterns this layer exists for.

import type { MiddlewareHandler } from 'hono'

/** the runtime shape of a `ratelimits` binding (wrangler.jsonc) */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface RateLimitEnv {
  /** POST /api/auth/* — sign-in/up brute-force and signup spam */
  RL_AUTH?: RateLimiter
  /** POST /v1/chat — the provider relay */
  RL_CHAT?: RateLimiter
  /** every other /v1/* route (sync, credentials, me, usage) */
  RL_API?: RateLimiter
}

const tooMany = () =>
  Response.json(
    {
      type: 'about:blank',
      status: 429,
      code: 'rate_limited',
      detail: 'Too many requests — retry shortly',
    },
    { status: 429, headers: { 'retry-after': '60' } },
  )

const ipOf = (req: Request) => req.headers.get('cf-connecting-ip') ?? 'unknown'

/** true when the request survived the limiter (or no limiter is usable) */
async function allow(
  limiter: RateLimiter | undefined,
  key: string,
  binding: string,
): Promise<boolean> {
  if (!limiter) {
    // fail OPEN with a loud log — a missing binding is a config defect,
    // never a reason to take the product down
    console.error(
      JSON.stringify({ level: 'error', msg: 'rate limiter binding missing, failing open', binding }),
    )
    return true
  }
  try {
    return (await limiter.limit({ key })).success
  } catch (e) {
    // the limiter is a shield, not a dependency — fail open, keep evidence
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'rate limiter call failed, failing open',
        binding,
        error: (e as Error).message,
      }),
    )
    return true
  }
}

/** /v1/*: the chat relay rides RL_CHAT, everything else RL_API.
 *  OPTIONS passes free — CORS preflights must never burn budget. */
export const limitV1: MiddlewareHandler<{ Bindings: RateLimitEnv }> = async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  // no env at all = unit harness (hono app.request without bindings) — pass
  // silently; a PRESENT env with a missing binding is a config defect and logs
  const env = c.env as RateLimitEnv | undefined
  if (!env) return next()
  // uploads share the CHAT budget — 120/min of 10MB writes to R2 would be a
  // storage-cost vector; 30/min is still far beyond real use
  const heavy =
    c.req.path === '/v1/chat' || (c.req.path === '/v1/files' && c.req.method === 'POST')
  const name = heavy ? ('RL_CHAT' as const) : ('RL_API' as const)
  if (!(await allow(env[name], ipOf(c.req.raw), name))) return tooMany()
  return next()
}

/** /api/auth/*: POSTs only — sign-in/up/social kick-off. GETs stay free
 *  (OAuth callbacks and session probes are harmless and latency-critical). */
export const limitAuth: MiddlewareHandler<{ Bindings: RateLimitEnv }> = async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const env = c.env as RateLimitEnv | undefined
  if (!env) return next()
  if (!(await allow(env.RL_AUTH, ipOf(c.req.raw), 'RL_AUTH'))) return tooMany()
  return next()
}
