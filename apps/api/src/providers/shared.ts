// Shared provider-adapter contract: every adapter turns its upstream wire
// format (SSE or NDJSON) into Nova's event stream —
// message_start · block_delta{text} · message_stop{usage} · error.

import type { ChatProxyRequest } from '@nova/shared'

/** the proxy resolves the credential BEFORE calling — profile is guaranteed */
export type ResolvedChatRequest = ChatProxyRequest & {
  profile: NonNullable<ChatProxyRequest['profile']>
}

export interface NovaStreamEvent {
  type: 'message_start' | 'block_delta' | 'message_stop' | 'error'
  text?: string
  usage?: { inputTokens: number; outputTokens: number }
  code?: string
  message?: string
}

/** a credential that cannot possibly reach the provider — a 400, never a 502 */
export class ProviderConfigError extends Error {}

/** worker-level provider configuration (bindings/secrets an adapter may need).
 *  The gemini-cli OAuth client pair is PUBLIC (published in the gemini-cli
 *  repo) but lives in config — `.dev.vars` locally, `wrangler secret put` in
 *  prod — so no secret-shaped literal sits in source and secret scanning
 *  stays meaningful for real keys. */
export interface ProviderEnv {
  GEMINI_OAUTH_CLIENT_ID?: string
  GEMINI_OAUTH_CLIENT_SECRET?: string
}

export type EmitEvent = (event: NovaStreamEvent) => void

export interface LineHandler {
  /** one upstream line (already \r\n-trimmed); emit zero or more Nova events */
  line(line: string, emit: EmitEvent): void
  /** upstream closed — the place to emit a guaranteed terminal event */
  flush?(emit: EmitEvent): void
}

/**
 * Pipe a byte stream through a line splitter into Nova SSE frames.
 * Both SSE ("data: {…}") and NDJSON upstreams are line-delimited, so the
 * same splitter serves every adapter; the handler owns the wire semantics.
 */
export function novaLineStream(
  upstream: ReadableStream<Uint8Array>,
  handler: LineHandler,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const emitter =
    (controller: TransformStreamDefaultController<Uint8Array>): EmitEvent =>
    (event) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trimEnd()
          buffer = buffer.slice(idx + 1)
          handler.line(line, emitter(controller))
        }
      },
      flush(controller) {
        if (buffer) handler.line(buffer.trimEnd(), emitter(controller))
        handler.flush?.(emitter(controller))
      },
    }),
  )
}

/** payload of an SSE `data:` line — null for comments, blanks and [DONE] */
export function sseData(line: string): string | null {
  if (!line.startsWith('data:')) return null
  const raw = line.slice(5).trim()
  if (!raw || raw === '[DONE]') return null
  return raw
}
