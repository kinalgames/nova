// Shared provider-adapter contract: every adapter turns its upstream wire
// format (SSE or NDJSON) into Nova's event stream —
// message_start · block_delta{text} · thinking_delta{text} ·
// tool_start/tool_delta/tool_result · message_stop{usage} · error.

import type { ChatProxyRequest, ChatTurn } from '@nova/shared'

/** B1 — an attachment resolved into a provider-ready part. Text files are
 *  already folded into the turn's text by the resolver, so adapters only
 *  ever see binary parts here. */
export type ResolvedPart =
  | { type: 'image'; name: string; mime: string; base64: string }
  | { type: 'pdf'; name: string; base64: string }

/** a chat turn after attachment resolution */
export type ResolvedTurn = Pick<ChatTurn, 'role' | 'content'> & { parts?: ResolvedPart[] }

/** the proxy resolves credential AND attachments BEFORE calling — profile is
 *  guaranteed, messages carry provider-ready parts instead of refs */
export type ResolvedChatRequest = Omit<ChatProxyRequest, 'messages'> & {
  profile: NonNullable<ChatProxyRequest['profile']>
  messages: ResolvedTurn[]
}

/** chunked base64 — a spread over megabytes of bytes would blow the stack */
export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK)
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(bin)
}

/** one linked source a tool result carries (web hits, fetched pages) */
export interface NovaSource {
  n: number
  url: string
  title: string
}

export interface NovaStreamEvent {
  type:
    | 'message_start'
    | 'block_delta' // reply text
    | 'thinking_delta' // live reasoning text — the client renders it as a trace
    | 'tool_start' // a tool invocation began (provider-native or Nova-side)
    | 'tool_delta' // the invocation's arguments/query streaming in
    | 'tool_result' // invocation finished — summary + optional sources
    | 'message_stop'
    | 'error'
  text?: string
  usage?: { inputTokens: number; outputTokens: number }
  code?: string
  message?: string
  /** tool_* — invocation id correlating start/delta/result */
  id?: string
  /** tool_start — tool name ('web_search' · 'web_fetch' · 'files' …) */
  name?: string
  /** tool_result — whether the invocation succeeded */
  ok?: boolean
  /** tool_result — one-line outcome for the trace row */
  summary?: string
  /** tool_result — citations the reply can reference */
  sources?: NovaSource[]
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
