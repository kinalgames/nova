// OpenAI (ChatGPT) adapter — api_key only: `Authorization: Bearer` against
// the Chat Completions API. Uses `max_completion_tokens` (the gpt-5/o-series
// reasoning models reject `max_tokens` and sampling params) and
// `stream_options.include_usage` so the final chunk carries real token usage.

import type { ChatProxyRequest } from '@nova/shared'
import { novaLineStream, sseData, type ResolvedChatRequest } from './shared'

const API_URL = 'https://api.openai.com/v1/chat/completions'

export function openaiHeaders(
  profile: NonNullable<ChatProxyRequest['profile']>,
): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${profile.credential}`,
  }
}

export function openaiBody(req: ResolvedChatRequest): string {
  return JSON.stringify({
    model: req.model,
    messages: [
      ...(req.system?.trim() ? [{ role: 'system', content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: req.maxTokens ?? 8192,
  })
}

/** call the upstream with streaming enabled; the caller owns the response body */
export function callOpenAI(req: ResolvedChatRequest, signal?: AbortSignal): Promise<Response> {
  return fetch(API_URL, {
    method: 'POST',
    headers: openaiHeaders(req.profile),
    body: openaiBody(req),
    signal,
  })
}

interface OpenAIChunk {
  choices?: { delta?: { content?: string } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string; type?: string; code?: string | null }
}

/**
 * Transform the Chat Completions SSE stream into Nova's event contract.
 * The usage chunk arrives last (choices empty) before `[DONE]`; message_stop
 * is emitted at close so that usage is always captured.
 */
export function toNovaStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let started = false
  let errored = false
  let inputTokens = 0
  let outputTokens = 0

  return novaLineStream(upstream, {
    line(line, emit) {
      const raw = sseData(line)
      if (!raw) return
      let chunk: OpenAIChunk
      try {
        chunk = JSON.parse(raw) as OpenAIChunk
      } catch {
        return
      }
      if (chunk.error) {
        errored = true
        emit({
          type: 'error',
          code: chunk.error.code ?? chunk.error.type ?? 'upstream_error',
          message: chunk.error.message ?? 'Provider stream error',
        })
        return
      }
      if (!started) {
        started = true
        emit({ type: 'message_start' })
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? inputTokens
        outputTokens = chunk.usage.completion_tokens ?? outputTokens
      }
      const delta = chunk.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) emit({ type: 'block_delta', text: delta })
    },
    flush(emit) {
      if (!errored) emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
    },
  })
}
