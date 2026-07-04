// Ollama adapter — the credential IS the endpoint URL (self-hosted, no auth
// header). Streams NDJSON from {endpoint}/api/chat; the final `done:true`
// line carries prompt_eval_count/eval_count as real token usage.

import { ProviderConfigError, novaLineStream, type ResolvedChatRequest } from './shared'

/** validate + normalize the endpoint credential; throws ProviderConfigError */
export function ollamaEndpoint(credential: string): string {
  const trimmed = credential.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new ProviderConfigError(
      'Ollama endpoint must be an http(s) URL, e.g. http://localhost:11434',
    )
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new ProviderConfigError('Ollama endpoint must use http or https')
  return trimmed.replace(/\/+$/, '')
}

export function ollamaBody(req: ResolvedChatRequest): string {
  return JSON.stringify({
    model: req.model,
    messages: [
      ...(req.system?.trim() ? [{ role: 'system', content: req.system }] : []),
      // B1 — ollama takes text only here: binary parts degrade into notes
      ...req.messages.map((m) => ({
        role: m.role,
        content: [
          ...(m.parts ?? []).map((p) => `[attached: ${p.name} — not readable by this model]`),
          m.content,
        ]
          .filter(Boolean)
          .join('\n\n'),
      })),
    ],
    stream: true,
    // B6b — the thinking knob arrives ONLY for models the client knows can
    // reason (capability-gated); off must actually switch thinking off, or a
    // reasoning model silently burns its budget on hidden thought
    ...(req.thinking !== undefined ? { think: req.thinking !== 'off' } : {}),
    options: { num_predict: req.maxTokens ?? 8192 },
  })
}

/** call the upstream with streaming enabled; the caller owns the response body */
export function callOllama(req: ResolvedChatRequest, signal?: AbortSignal): Promise<Response> {
  const endpoint = ollamaEndpoint(req.profile.credential)
  return fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: ollamaBody(req),
    signal,
  })
}

interface OllamaChunk {
  message?: { content?: string; thinking?: string }
  done?: boolean
  prompt_eval_count?: number
  eval_count?: number
  error?: string
}

/** Transform the Ollama NDJSON stream into Nova's event contract.
 *  `message.thinking` chunks stream as thinking_delta — without this a
 *  reasoning model appears frozen for its whole hidden-thought phase. */
export function toNovaStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let started = false
  let errored = false
  let stopped = false
  let inputTokens = 0
  let outputTokens = 0

  return novaLineStream(upstream, {
    line(line, emit) {
      if (!line) return
      let chunk: OllamaChunk
      try {
        chunk = JSON.parse(line) as OllamaChunk
      } catch {
        return
      }
      if (typeof chunk.error === 'string') {
        errored = true
        emit({ type: 'error', code: 'upstream_error', message: chunk.error })
        return
      }
      if (!started) {
        started = true
        emit({ type: 'message_start' })
      }
      if (typeof chunk.prompt_eval_count === 'number') inputTokens = chunk.prompt_eval_count
      if (typeof chunk.eval_count === 'number') outputTokens = chunk.eval_count
      const think = chunk.message?.thinking
      if (typeof think === 'string' && think) emit({ type: 'thinking_delta', text: think })
      const text = chunk.message?.content
      if (typeof text === 'string' && text) emit({ type: 'block_delta', text })
      if (chunk.done === true && !stopped) {
        stopped = true
        emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
      }
    },
    flush(emit) {
      if (!errored && !stopped)
        emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
    },
  })
}
