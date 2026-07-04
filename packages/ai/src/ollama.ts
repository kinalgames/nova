// Ollama adapter — the credential IS the endpoint URL (self-hosted, no auth
// header). Streams NDJSON from {endpoint}/api/chat; the final `done:true`
// line carries prompt_eval_count/eval_count as real token usage.

import {
  ProviderConfigError,
  novaLineStream,
  type ResolvedChatRequest,
  type RoundCapture,
  type ToolCallResult,
} from './shared'

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

/** T5 — continuation tail: assistant turn with its tool_calls + one tool
 *  message per result (ollama has no call ids — order is the correlation) */
export function ollamaToolTail(round: RoundCapture, results: ToolCallResult[]): unknown[] {
  return [
    round.assistantTurn,
    ...round.calls.map((c, i) => ({
      role: 'tool',
      tool_name: c.name,
      content: results[i]?.content ?? '',
    })),
  ]
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
      // T5 — loop continuation turns, already in ollama's own shape
      ...((req.rawTail ?? []) as Record<string, unknown>[]),
    ],
    // T5 — Nova-side function tools (OpenAI-compatible declaration shape)
    ...(req.novaTools?.length
      ? {
          tools: req.novaTools.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
        }
      : {}),
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
  message?: {
    content?: string
    thinking?: string
    tool_calls?: { function?: { name?: string; arguments?: unknown } }[]
  }
  done?: boolean
  prompt_eval_count?: number
  eval_count?: number
  error?: string
}

/** Transform the Ollama NDJSON stream into Nova's event contract.
 *  `message.thinking` chunks stream as thinking_delta — without this a
 *  reasoning model appears frozen for its whole hidden-thought phase. */
export function toNovaStream(
  upstream: ReadableStream<Uint8Array>,
  round?: RoundCapture,
): ReadableStream<Uint8Array> {
  let started = false
  let errored = false
  let stopped = false
  let inputTokens = 0
  let outputTokens = 0
  let text = ''
  const toolCalls: { function: { name: string; arguments: unknown } }[] = []

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
      const delta = chunk.message?.content
      if (typeof delta === 'string' && delta) {
        text += delta
        emit({ type: 'block_delta', text: delta })
      }
      // T5 — the model asked for tools: queue them + surface on the trace
      for (const tc of chunk.message?.tool_calls ?? []) {
        if (!tc.function?.name) continue
        const id = `oll-${(round?.calls.length ?? toolCalls.length) + 1}`
        const args = JSON.stringify(tc.function.arguments ?? {})
        toolCalls.push({ function: { name: tc.function.name, arguments: tc.function.arguments ?? {} } })
        round?.calls.push({ id, name: tc.function.name, args })
        emit({ type: 'tool_start', id, name: tc.function.name })
        emit({ type: 'tool_delta', id, text: args })
      }
      if (chunk.done === true && !stopped) {
        stopped = true
        if (round)
          round.assistantTurn = {
            role: 'assistant',
            content: text,
            ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
          }
        emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
      }
    },
    flush(emit) {
      if (!errored && !stopped)
        emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
    },
  })
}
