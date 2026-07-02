// T8 — usage metering. Every completed proxy chat writes ONE Analytics
// Engine datapoint: blobs [providerId, modelId, kind], doubles [inTok,
// outTok], index [userId]. AE bindings are write-only inside Workers, so
// GET /v1/usage reads the current calendar month back through the AE SQL
// REST API — that path needs CF_ACCOUNT_ID + AE_SQL_TOKEN and degrades to
// 501 when a deployment does not configure them (the client then falls back
// to its local roll-up).

import { Hono } from 'hono'
import { createAuth, type AuthEnv } from './auth'

export interface UsageEnv extends AuthEnv {
  /** AE dataset binding — write-only from inside the Worker */
  USAGE?: AnalyticsEngineDataset
  /** account id + API token for the AE SQL (read) API; optional per deploy */
  CF_ACCOUNT_ID?: string
  AE_SQL_TOKEN?: string
}

export const USAGE_DATASET = 'nova_usage'

export interface NovaUsageTotals {
  inputTokens: number
  outputTokens: number
}

/**
 * Tap Nova SSE frames as they stream to the client and report the
 * message_stop usage exactly once. The bytes pass through untouched —
 * metering must never distort or stall the reply.
 */
export function tapNovaUsage(
  stream: ReadableStream<Uint8Array>,
  onStop: (usage: NovaUsageTotals) => void,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  let buffer = ''
  let reported = false

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk)
        if (reported) return
        buffer += decoder.decode(chunk, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          if (!frame.startsWith('data: ')) continue
          let evt: {
            type?: string
            usage?: { inputTokens?: number; outputTokens?: number }
          } | null
          try {
            evt = JSON.parse(frame.slice(6)) as typeof evt
          } catch {
            evt = null
          }
          if (evt?.type === 'message_stop' && evt.usage && !reported) {
            reported = true
            onStop({
              inputTokens: evt.usage.inputTokens ?? 0,
              outputTokens: evt.usage.outputTokens ?? 0,
            })
          }
        }
      },
    }),
  )
}

const problem = (status: number, code: string, detail: string) =>
  Response.json({ type: 'about:blank', status, code, detail }, { status })

async function requireUser(c: { env: UsageEnv; req: { raw: Request } }) {
  try {
    const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
    return session?.user.id ?? null
  } catch {
    // fail CLOSED: an auth-backend hiccup is "no session", never a 500
    return null
  }
}

export const usage = new Hono<{ Bindings: UsageEnv }>()

usage.get('/', async (c) => {
  const uid = await requireUser(c)
  if (!uid) return problem(401, 'unauthenticated', 'No valid session')
  if (!c.env.CF_ACCOUNT_ID || !c.env.AE_SQL_TOKEN)
    return problem(501, 'not_configured', 'Usage analytics is not configured on this deployment')

  const now = new Date()
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01 00:00:00`
  // index values are Better-Auth-generated ids, but never trust interpolation
  const safeUid = uid.replace(/[^\w.-]/g, '')
  // sum(_sample_interval * double) is the sampling-correct aggregate
  const sql =
    `SELECT blob1 AS providerId, blob2 AS modelId, blob3 AS kind, ` +
    `SUM(_sample_interval * double1) AS inTok, SUM(_sample_interval * double2) AS outTok ` +
    `FROM ${USAGE_DATASET} WHERE index1 = '${safeUid}' ` +
    `AND timestamp >= toDateTime('${monthStart}') ` +
    `GROUP BY providerId, modelId, kind FORMAT JSON`

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${c.env.AE_SQL_TOKEN}` },
      body: sql,
    },
  ).catch(() => null)
  if (!res || !res.ok) {
    const detail = res ? (await res.text().catch(() => '')).slice(0, 500) : 'unreachable'
    return problem(502, 'upstream_error', `Analytics Engine SQL failed: ${detail}`)
  }
  const data = (await res.json()) as {
    data?: {
      providerId: string
      modelId: string
      kind: string
      inTok: number | string
      outTok: number | string
    }[]
  }
  // ClickHouse JSON renders large aggregates as strings — normalize
  const rows = (data.data ?? []).map((r) => ({
    providerId: r.providerId,
    modelId: r.modelId,
    kind: r.kind,
    inTok: Number(r.inTok) || 0,
    outTok: Number(r.outTok) || 0,
  }))
  return c.json({ month: monthStart.slice(0, 7), rows })
})
