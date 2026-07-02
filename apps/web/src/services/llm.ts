// Real chat streaming through the nova-api provider proxy (SSE). The fake
// composeReply layer remains the demo-mode fallback; this path activates when
// a NON-DEMO auth profile exists for the routed provider.

import type { ChatProxyRequest } from '@nova/shared'

/** API origin — dev defaults to the local wrangler dev port */
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:8787' : '')

export interface StreamHandlers {
  onDelta: (text: string) => void
  onDone: (usage: { inputTokens: number; outputTokens: number }) => void
  onError: (code: string, message: string, status?: number, retryAfterSec?: number) => void
}

/** POST /v1/chat and forward Nova-contract SSE events to the handlers */
export async function streamChat(
  req: ChatProxyRequest,
  h: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
  } catch (e) {
    if ((e as Error).name !== 'AbortError')
      h.onError('network', 'Không kết nối được máy chủ Nova API')
    return
  }
  if (!res.ok) {
    const retry = Number(res.headers.get('retry-after') ?? '') || undefined
    const body = (await res.json().catch(() => ({}))) as { code?: string; detail?: string }
    h.onError(body.code ?? 'upstream_error', body.detail ?? res.statusText, res.status, retry)
    return
  }
  const reader = res.body?.getReader()
  if (!reader) {
    h.onError('empty_stream', 'Máy chủ không trả về stream')
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
        let evt: { type?: string; text?: string; usage?: { inputTokens: number; outputTokens: number }; code?: string; message?: string }
        try {
          evt = JSON.parse(frame.slice(6))
        } catch {
          continue
        }
        if (evt.type === 'block_delta' && evt.text) h.onDelta(evt.text)
        else if (evt.type === 'message_stop') {
          h.onDone(evt.usage ?? { inputTokens: 0, outputTokens: 0 })
          return
        } else if (evt.type === 'error') {
          h.onError(evt.code ?? 'stream_error', evt.message ?? 'Stream lỗi')
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
