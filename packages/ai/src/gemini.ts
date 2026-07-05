// Gemini adapter — api_key only, against generativelanguage.googleapis.com
// (`x-goog-api-key`, the officially supported path). Nova does NOT reuse the
// gemini-cli OAuth client to reach the Code Assist transport
// (cloudcode-pa.googleapis.com) — Google has both sunset that path for
// personal Google accounts (Enterprise/Standard license only, since 2026-06-18)
// and banned real user accounts for third-party apps piggybacking on its
// OAuth client. See docs/session-handoff.md for the removal rationale.

import {
  ProviderConfigError,
  novaLineStream,
  sseData,
  type ResolvedChatRequest,
  type RoundCapture,
  type ToolCallResult,
} from './shared'

const GENLANG_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/** B5 — thinkingBudget per level for the 2.5 generation. Gemini 3+ takes
 *  `thinkingLevel` instead and rejects a budget — omit config there until the
 *  catalog carries a 3.x model. 'normal'/absent = dynamic thinking (default). */
const THINKING_BUDGET = { low: 2048, high: 24576 } as const

export function geminiThinkingConfig(
  req: Pick<ResolvedChatRequest, 'model' | 'thinking'>,
): { thinkingBudget: number } | null {
  const level = req.thinking
  if (!level || level === 'normal') return null
  if (/^gemini-3/.test(req.model)) return null
  if (level === 'off')
    // 2.5 Pro cannot disable thinking — 128 is its floor; Flash can go to 0
    return { thinkingBudget: /^gemini-2\.5-pro/.test(req.model) ? 128 : 0 }
  return { thinkingBudget: THINKING_BUDGET[level] }
}

/** the GenerateContentRequest both Gemini transports share */
export function geminiRequest(req: ResolvedChatRequest): Record<string, unknown> {
  const budget = geminiThinkingConfig(req)
  // thought summaries stream back only when asked — includeThoughts rides
  // whenever the user left thinking ON (all generations accept the flag;
  // gen-3 rejects only thinkingBudget, which geminiThinkingConfig already
  // withholds there)
  const wantThoughts = !!req.thinking && req.thinking !== 'off'
  const thinkingConfig =
    budget || wantThoughts ? { ...(budget ?? {}), ...(wantThoughts ? { includeThoughts: true } : {}) } : null
  // D1 — built-in tools: search grounding + URL context, each opt-in per
  // request; the provider executes them and bills the user's own key
  const tools = [
    ...(req.search ? [{ google_search: {} }] : []),
    ...(req.fetch ? [{ url_context: {} }] : []),
    // T5 — Nova-side function tools; gen-3 combines them with built-ins
    ...(req.novaTools?.length
      ? [
          {
            functionDeclarations: req.novaTools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })),
          },
        ]
      : []),
  ]
  return {
    ...(tools.length ? { tools } : {}),
    // B1 — binary parts ride as inline_data ahead of the text part
    contents: [...req.messages.map((m) => {
      const parts = [
        ...(m.parts ?? []).map((p) => ({
          inline_data: {
            mime_type: p.type === 'pdf' ? 'application/pdf' : p.mime,
            data: p.base64,
          },
        })),
        ...(m.content ? [{ text: m.content }] : []),
      ]
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: parts.length ? parts : [{ text: m.content }],
      }
    }), ...((req.rawTail ?? []) as Record<string, unknown>[])],
    ...(req.system?.trim() ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    generationConfig: {
      maxOutputTokens: req.maxTokens ?? 8192,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
  }
}

/** call the upstream with streaming enabled; the caller owns the response body */
export async function callGemini(req: ResolvedChatRequest, signal?: AbortSignal): Promise<Response> {
  if (req.profile.kind !== 'api_key')
    throw new ProviderConfigError('Gemini only accepts an api_key profile')
  return fetch(`${GENLANG_BASE}/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': req.profile.credential },
    body: JSON.stringify(geminiRequest(req)),
    signal,
  })
}

/** T5 — continuation tail: the model turn (functionCall parts keep their
 *  gen-3 thoughtSignature) + one user turn of functionResponse parts */
export function geminiToolTail(round: RoundCapture, results: ToolCallResult[]): unknown[] {
  return [
    round.assistantTurn,
    {
      role: 'user',
      parts: round.calls.map((c, i) => ({
        functionResponse: {
          name: c.name,
          response: { result: results[i]?.content ?? '' },
        },
      })),
    },
  ]
}

interface GeminiChunk {
  candidates?: {
    content?: {
      parts?: {
        text?: string
        thought?: boolean
        thoughtSignature?: string
        functionCall?: { name?: string; args?: unknown }
      }[]
    }
    groundingMetadata?: {
      webSearchQueries?: string[]
      groundingChunks?: { web?: { uri?: string; title?: string } }[]
      /** which reply span each grounding chunk backs — offsets into the
       *  candidate's OWN accumulated (non-thought) text */
      groundingSupports?: {
        segment?: { startIndex?: number; endIndex?: number; text?: string }
        groundingChunkIndices?: number[]
      }[]
    }
    urlContextMetadata?: {
      urlMetadata?: { retrievedUrl?: string; urlRetrievalStatus?: string }[]
    }
  }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
  }
  error?: { code?: number; message?: string; status?: string }
}

/**
 * Transform the Gemini SSE stream into Nova's event contract.
 * Gemini has no explicit stop event — message_stop is emitted when the
 * upstream closes, carrying the final usage (thought tokens bill as output,
 * so they count toward outputTokens). Parts flagged `thought: true` are
 * reasoning summaries → thinking_delta.
 */
export function toNovaStream(
  upstream: ReadableStream<Uint8Array>,
  round?: RoundCapture,
): ReadableStream<Uint8Array> {
  let started = false
  let errored = false
  let inputTokens = 0
  let outputTokens = 0
  let groundedEmitted = false
  let fetchedEmitted = false
  let sourceN = 0
  let text = ''
  // model parts replayed verbatim next round (keeps thoughtSignature)
  const modelParts: Record<string, unknown>[] = []

  return novaLineStream(upstream, {
    line(line, emit) {
      const raw = sseData(line)
      if (!raw) return
      let chunk: GeminiChunk
      try {
        chunk = JSON.parse(raw) as GeminiChunk
      } catch {
        return
      }
      if (chunk.error) {
        errored = true
        emit({
          type: 'error',
          code: chunk.error.status ?? 'upstream_error',
          message: chunk.error.message ?? 'Provider stream error',
        })
        return
      }
      if (!started) {
        started = true
        emit({ type: 'message_start' })
      }
      const usage = chunk.usageMetadata
      if (usage) {
        inputTokens = usage.promptTokenCount ?? inputTokens
        outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0)
      }
      const parts = chunk.candidates?.[0]?.content?.parts
      if (Array.isArray(parts))
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text) {
            if (part.thought !== true) text += part.text
            emit({ type: part.thought === true ? 'thinking_delta' : 'block_delta', text: part.text })
          }
          // T5 — a function call: queue for execution + surface on the trace
          if (round && part.functionCall?.name) {
            const id = `gm-${round.calls.length + 1}`
            const args = JSON.stringify(part.functionCall.args ?? {})
            modelParts.push({
              functionCall: { name: part.functionCall.name, args: part.functionCall.args ?? {} },
              ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
            })
            round.calls.push({ id, name: part.functionCall.name, args })
            emit({ type: 'tool_start', id, name: part.functionCall.name })
            emit({ type: 'tool_delta', id, text: args })
          }
        }
      // D1 — grounding: Gemini runs the search itself and attaches metadata
      // (usually on the final chunk); surface it once as a finished tool call
      const grounding = chunk.candidates?.[0]?.groundingMetadata
      if (grounding?.groundingChunks?.length && !groundedEmitted) {
        groundedEmitted = true
        // the SAME numbering the sources array below assigns, keyed by each
        // chunk's ORIGINAL index — groundingSupports references chunks by
        // that original index, which skips ahead of any chunk missing a uri
        const chunkIndexToN = new Map<number, number>()
        let n = sourceN
        grounding.groundingChunks.forEach((g, i) => {
          if (typeof g.web?.uri === 'string') chunkIndexToN.set(i, ++n)
        })
        const sources = grounding.groundingChunks
          .filter((g) => typeof g.web?.uri === 'string')
          .map((g, i) => ({
            n: sourceN + i + 1,
            url: g.web!.uri!,
            title: g.web?.title ?? g.web!.uri!,
          }))
        sourceN += sources.length
        emit({ type: 'tool_start', id: 'gs-1', name: 'web_search' })
        if (grounding.webSearchQueries?.length)
          emit({ type: 'tool_delta', id: 'gs-1', text: grounding.webSearchQueries.join(' · ') })
        emit({ type: 'tool_result', id: 'gs-1', ok: true, ...(sources.length ? { sources } : {}) })
        for (const support of grounding.groundingSupports ?? []) {
          const seg = support.segment
          const chunkIdx = support.groundingChunkIndices?.[0]
          if (typeof seg?.startIndex !== 'number' || typeof seg?.endIndex !== 'number') continue
          const citeSource = typeof chunkIdx === 'number' ? chunkIndexToN.get(chunkIdx) : undefined
          emit({
            type: 'citation',
            citeStart: seg.startIndex,
            citeEnd: seg.endIndex,
            ...(citeSource ? { citeSource } : {}),
          })
        }
      }
      const urlMeta = chunk.candidates?.[0]?.urlContextMetadata
      if (urlMeta?.urlMetadata?.length && !fetchedEmitted) {
        fetchedEmitted = true
        const rows = urlMeta.urlMetadata.filter((u) => typeof u.retrievedUrl === 'string')
        const ok = rows.some((u) => u.urlRetrievalStatus?.includes('SUCCESS'))
        const sources = rows.map((u, i) => ({ n: sourceN + i + 1, url: u.retrievedUrl!, title: u.retrievedUrl! }))
        sourceN += sources.length
        emit({ type: 'tool_start', id: 'uc-1', name: 'web_fetch' })
        emit({ type: 'tool_result', id: 'uc-1', ok, ...(sources.length ? { sources } : {}) })
      }
    },
    flush(emit) {
      if (round)
        round.assistantTurn = {
          role: 'model',
          parts: [...(text ? [{ text }] : []), ...modelParts],
        }
      if (!errored) emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
    },
  })
}
