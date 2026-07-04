// Real chat streaming through the nova-api provider proxy (SSE). Sends route
// here whenever an auth profile exists for the routed provider.

import type { ChatProxyRequest } from '@nova/shared'
import { getToken } from './token'
import i18n from '../i18n'

/** API origin PREFIX — dev points at local wrangler; the deployed Worker
 *  serves web + API same-origin, so the production prefix is '' */
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '')

/** a real backend exists — NEVER gate on API_BASE truthiness: same-origin
 *  production has API_BASE === '' yet very much has an API */
export const HAS_API: boolean = import.meta.env.PROD || API_BASE !== ''

/** one linked source a tool result carries */
export interface ToolSource {
  n: number
  url: string
  title: string
}

export interface StreamHandlers {
  onDelta: (text: string) => void
  /** live reasoning text — thinking models stream it ahead of the reply */
  onThinking?: (text: string) => void
  /** D1 — a provider-native (or Nova-side) tool invocation began */
  onToolStart?: (id: string, name: string) => void
  /** the invocation's arguments/query streaming in */
  onToolDelta?: (id: string, text: string) => void
  /** invocation finished — outcome + optional citations */
  onToolResult?: (id: string, ok: boolean, summary?: string, sources?: ToolSource[]) => void
  onDone: (usage: { inputTokens: number; outputTokens: number }) => void
  onError: (
    code: string,
    message: string,
    status?: number,
    retryAfterSec?: number,
    /** B4 — server correlation id; the error card surfaces it so a user
     *  report can be matched to the worker's structured logs */
    requestId?: string,
  ) => void
}

/** POST /v1/chat and forward Nova-contract SSE events to the handlers */
export async function streamChat(
  req: ChatProxyRequest,
  h: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  // B3: the relay requires a session — attach the bearer so every chat is
  // attributed to the signed-in user (metering + per-user protections)
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(req),
      signal,
    })
  } catch (e) {
    if ((e as Error).name !== 'AbortError')
      h.onError('network', i18n.t('errors.apiNetwork'))
    return
  }
  if (!res.ok) {
    const retry = Number(res.headers.get('retry-after') ?? '') || undefined
    const body = (await res.json().catch(() => ({}))) as { code?: string; detail?: string }
    h.onError(
      body.code ?? 'upstream_error',
      body.detail ?? res.statusText,
      res.status,
      retry,
      res.headers.get('x-request-id') ?? undefined,
    )
    return
  }
  const reader = res.body?.getReader()
  if (!reader) {
    h.onError('empty_stream', i18n.t('errors.emptyStream'))
    return
  }
  const dec = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i: number
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, i)
        buf = buf.slice(i + 2)
        if (!frame.startsWith('data: ')) continue
        let evt: {
          type?: string
          text?: string
          usage?: { inputTokens: number; outputTokens: number }
          code?: string
          message?: string
          id?: string
          name?: string
          ok?: boolean
          summary?: string
          sources?: ToolSource[]
        }
        try {
          evt = JSON.parse(frame.slice(6))
        } catch {
          continue
        }
        if (evt.type === 'block_delta' && evt.text) h.onDelta(evt.text)
        else if (evt.type === 'thinking_delta' && evt.text) h.onThinking?.(evt.text)
        else if (evt.type === 'tool_start' && evt.id) h.onToolStart?.(evt.id, evt.name ?? 'tool')
        else if (evt.type === 'tool_delta' && evt.id && evt.text) h.onToolDelta?.(evt.id, evt.text)
        else if (evt.type === 'tool_result' && evt.id)
          h.onToolResult?.(evt.id, evt.ok !== false, evt.summary, evt.sources)
        else if (evt.type === 'message_stop') {
          h.onDone(evt.usage ?? { inputTokens: 0, outputTokens: 0 })
          return
        } else if (evt.type === 'error') {
          h.onError(evt.code ?? 'stream_error', evt.message ?? i18n.t('errors.stream'))
          return
        }
      }
    }
    // stream ended without message_stop — treat as done with unknown usage
    h.onDone({ inputTokens: 0, outputTokens: 0 })
  } catch (e) {
    if ((e as Error).name !== 'AbortError') h.onError('stream_read', (e as Error).message)
  }
}
