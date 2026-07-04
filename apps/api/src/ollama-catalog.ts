// B6c — dynamic ollama catalog through the proxy: list the models the user's
// endpoint actually serves (with REAL capabilities from /api/show) and pull
// new ones with streamed progress. The endpoint is the user's own BYOK
// credential — same trust model as the chat proxy.

import type { ModelDef } from '@nova/shared'
import { ollamaEndpoint } from './providers/ollama'

/** a catalog row: the shared ModelDef plus the human size badge */
export interface OllamaModelRow extends ModelDef {
  size: string
}

interface TagsResponse {
  models?: {
    name?: string
    size?: number
    details?: { parameter_size?: string }
  }[]
}

interface ShowResponse {
  capabilities?: string[]
  model_info?: Record<string, unknown>
}

const fmtBytes = (n: number | undefined): string =>
  typeof n === 'number' && n > 0 ? `${(n / 1024 / 1024 / 1024).toFixed(1)} GB` : ''

/** context length hides behind an arch-prefixed key ("qwen3.context_length") */
function ctxOf(info: Record<string, unknown> | undefined): number {
  if (!info) return 0
  for (const [k, v] of Object.entries(info))
    if (k.endsWith('.context_length') && typeof v === 'number') return v
  return 0
}

function capsOf(show: ShowResponse | null): ModelDef['caps'] {
  const c = show?.capabilities ?? []
  return {
    ...(c.includes('thinking') ? { reasoning: true } : {}),
    ...(c.includes('vision') ? { vision: true } : {}),
    ...(c.includes('audio') ? { audio: true } : {}),
    ...(c.includes('video') ? { video: true } : {}),
    ...(c.includes('tools') ? { toolUse: true } : {}),
  }
}

const SHOW_LIMIT = 30
const TIMEOUT_MS = 8_000

/** GET the endpoint's installed models with real caps; null = unreachable */
export async function listOllamaModels(endpointRaw: string): Promise<OllamaModelRow[] | null> {
  const ep = ollamaEndpoint(endpointRaw)
  let tags: TagsResponse
  try {
    const res = await fetch(`${ep}/api/tags`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    tags = (await res.json()) as TagsResponse
  } catch {
    return null
  }
  const models = (tags.models ?? []).filter((m) => typeof m.name === 'string').slice(0, SHOW_LIMIT)
  const shows = await Promise.all(
    models.map(async (m): Promise<ShowResponse | null> => {
      try {
        const res = await fetch(`${ep}/api/show`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: m.name }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        return res.ok ? ((await res.json()) as ShowResponse) : null
      } catch {
        return null
      }
    }),
  )
  return models.map((m, i) => ({
    id: m.name as string,
    name: m.name as string,
    // placeholder — local models list in BOTH slot pickers client-side
    mode: 'fast' as const,
    caps: capsOf(shows[i]),
    ctx: ctxOf(shows[i]?.model_info),
    inPrice: 0,
    outPrice: 0,
    size: fmtBytes(m.size) || (m.details?.parameter_size ?? ''),
  }))
}

/** progress frame re-emitted to the client as SSE data lines */
export interface PullProgress {
  status?: string
  total?: number
  completed?: number
  error?: string
  done?: boolean
}

/**
 * Proxy {endpoint}/api/pull as an SSE stream of PullProgress frames. The
 * upstream speaks NDJSON; the final frame carries done:true (or error).
 */
export async function pullOllamaModel(endpointRaw: string, model: string): Promise<Response> {
  const ep = ollamaEndpoint(endpointRaw)
  let upstream: Response
  try {
    upstream = await fetch(`${ep}/api/pull`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, stream: true }),
    })
  } catch {
    return sseOnce({ error: 'ollama_unreachable', done: true }, 502)
  }
  if (!upstream.ok || !upstream.body)
    return sseOnce({ error: `pull failed (${upstream.status})`, done: true }, 502)

  const enc = new TextEncoder()
  const dec = new TextDecoder()
  let buf = ''
  const reader = upstream.body.getReader()
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read()
      if (done) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
        return
      }
      buf += dec.decode(value, { stream: true })
      let i: number
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        if (!line) continue
        try {
          const p = JSON.parse(line) as PullProgress
          controller.enqueue(enc.encode(`data: ${JSON.stringify(p)}\n\n`))
        } catch {
          /* partial line noise — skip */
        }
      }
    },
    cancel(reason) {
      void reader.cancel(reason)
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
  })
}

function sseOnce(frame: PullProgress, status: number): Response {
  return new Response(`data: ${JSON.stringify(frame)}\n\n`, {
    status,
    headers: { 'content-type': 'text/event-stream' },
  })
}
