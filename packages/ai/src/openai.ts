// OpenAI (ChatGPT) adapter — api_key only: `Authorization: Bearer` against
// the RESPONSES API (OpenAI's recommended surface; Chat Completions has no
// hosted web_search). Streams typed `response.*` events; `instructions`
// carries the system prompt, `input` the turns, `max_output_tokens` the
// ceiling. Reasoning summaries stream back as thinking (when the user's org
// is verified for them — absent otherwise, which degrades gracefully).

import type { ChatProxyRequest } from '@nova/shared'
import { novaLineStream, sseData, type ResolvedChatRequest } from './shared'

const API_URL = 'https://api.openai.com/v1/responses'

export function openaiHeaders(
  profile: NonNullable<ChatProxyRequest['profile']>,
): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${profile.credential}`,
  }
}

/** B5 — reasoning models take reasoning.effort; anything else rejects the
 *  param, so it is only sent to gpt-5 and o-series ids. 'off' maps to
 *  gpt-5's 'minimal'; o-series has no minimal, so 'off' omits the param. */
const REASONING_MODEL = /^(gpt-5|o\d)/
const REASONING_EFFORT = { low: 'low', normal: 'medium', high: 'high' } as const

export function openaiReasoningEffort(
  req: Pick<ResolvedChatRequest, 'model' | 'thinking'>,
): string | null {
  if (!req.thinking || !REASONING_MODEL.test(req.model)) return null
  if (req.thinking === 'off') return req.model.startsWith('gpt-5') ? 'minimal' : null
  return REASONING_EFFORT[req.thinking]
}

export function openaiBody(req: ResolvedChatRequest): string {
  const effort = openaiReasoningEffort(req)
  // OpenAI exposes ONE hosted research tool — web_search (page opening is an
  // action inside it), so either flag declares it
  const webSearch = !!(req.search || req.fetch)
  return JSON.stringify({
    model: req.model,
    ...(req.system?.trim() ? { instructions: req.system } : {}),
    // B1 — images ride as input_image data URLs; PDFs are not wired through
    // Responses file inputs yet, so they degrade into a bracketed note the
    // model can acknowledge honestly
    input: req.messages.map((m) => {
      if (m.role === 'assistant')
        // phase marks replayed turns as complete answers — the gpt-5.5 line
        // misreads unmarked assistant history in tool-heavy conversations
        return { role: 'assistant', content: m.content, phase: 'final_answer' }
      const images = (m.parts ?? []).filter((p) => p.type === 'image')
      const unread = (m.parts ?? []).filter((p) => p.type === 'pdf')
      const text = [
        ...unread.map((p) => `[attached: ${p.name} — not readable by this model]`),
        m.content,
      ]
        .filter(Boolean)
        .join('\n\n')
      return images.length
        ? {
            role: 'user',
            content: [
              ...images.map((p) => ({
                type: 'input_image',
                // signed URL when available — OpenAI fetches it; data URL fallback
                image_url: p.url ?? `data:${p.mime};base64,${p.base64 ?? ''}`,
              })),
              { type: 'input_text', text },
            ],
          }
        : { role: 'user', content: text }
    }),
    stream: true,
    max_output_tokens: req.maxTokens ?? 8192,
    // summary:'auto' asks for reasoning summaries — they stream as thinking
    ...(effort ? { reasoning: { effort, summary: 'auto' } } : {}),
    ...(webSearch ? { tools: [{ type: 'web_search' }] } : {}),
    ...(webSearch ? { include: ['web_search_call.action.sources'] } : {}),
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

interface OpenAIEvent {
  type?: string
  delta?: string
  item?: {
    type?: string
    id?: string
    status?: string
    action?: {
      type?: string
      query?: string
      queries?: string[]
      sources?: { url?: string; title?: string }[]
    }
  }
  annotation?: { type?: string; url?: string; title?: string }
  response?: {
    usage?: { input_tokens?: number; output_tokens?: number }
    error?: { code?: string; message?: string }
  }
  error?: { code?: string; message?: string }
  code?: string
  message?: string
}

/**
 * Transform the Responses SSE stream into Nova's event contract:
 * output_text deltas → block_delta · reasoning summary deltas →
 * thinking_delta · web_search_call items → tool events (sources from
 * action.sources, falling back to url_citation annotations) ·
 * response.completed → message_stop with real usage.
 */
export function toNovaStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let started = false
  let errored = false
  let stopped = false
  let inputTokens = 0
  let outputTokens = 0
  let sourceN = 0
  let sourcesEmitted = false
  // url_citation annotations — the fallback citation channel when the
  // search call carries no action.sources
  const citations: { n: number; url: string; title: string }[] = []
  const seenUrls = new Set<string>()

  return novaLineStream(upstream, {
    line(line, emit) {
      const raw = sseData(line)
      if (!raw) return
      let evt: OpenAIEvent
      try {
        evt = JSON.parse(raw) as OpenAIEvent
      } catch {
        return
      }
      if (!started && evt.type?.startsWith('response.')) {
        started = true
        emit({ type: 'message_start' })
      }
      switch (evt.type) {
        case 'response.output_text.delta':
          if (evt.delta) emit({ type: 'block_delta', text: evt.delta })
          break
        case 'response.reasoning_summary_text.delta':
          if (evt.delta) emit({ type: 'thinking_delta', text: evt.delta })
          break
        case 'response.output_item.added':
          if (evt.item?.type === 'web_search_call' && evt.item.id)
            emit({ type: 'tool_start', id: evt.item.id, name: 'web_search' })
          break
        case 'response.output_item.done': {
          const item = evt.item
          if (item?.type !== 'web_search_call' || !item.id) break
          const query = item.action?.query ?? item.action?.queries?.join(' · ')
          if (query) emit({ type: 'tool_delta', id: item.id, text: query })
          const sources = (item.action?.sources ?? [])
            .filter((s) => typeof s.url === 'string')
            .map((s) => ({ n: ++sourceN, url: s.url!, title: s.title ?? s.url! }))
          if (sources.length) sourcesEmitted = true
          emit({
            type: 'tool_result',
            id: item.id,
            ok: item.status !== 'failed',
            ...(sources.length ? { sources } : {}),
          })
          break
        }
        case 'response.output_text.annotation.added': {
          const a = evt.annotation
          if (a?.type === 'url_citation' && a.url && !seenUrls.has(a.url)) {
            seenUrls.add(a.url)
            citations.push({ n: ++sourceN, url: a.url, title: a.title ?? a.url })
          }
          break
        }
        case 'response.completed':
        case 'response.incomplete': {
          inputTokens = evt.response?.usage?.input_tokens ?? inputTokens
          outputTokens = evt.response?.usage?.output_tokens ?? outputTokens
          // citations arrived only as annotations — surface them once so the
          // client still gets a sources block
          if (citations.length && !sourcesEmitted)
            emit({ type: 'tool_result', id: 'cite-1', ok: true, sources: citations })
          stopped = true
          emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
          break
        }
        case 'response.failed':
          errored = true
          emit({
            type: 'error',
            code: evt.response?.error?.code ?? 'upstream_error',
            message: evt.response?.error?.message ?? 'Provider stream error',
          })
          break
        case 'error':
          errored = true
          emit({
            type: 'error',
            code: evt.code ?? 'upstream_error',
            message: evt.message ?? 'Provider stream error',
          })
          break
      }
    },
    flush(emit) {
      if (!errored && !stopped)
        emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
    },
  })
}
