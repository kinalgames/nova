// Anthropic Messages API adapter — two credential kinds, matching the
// product's 「Tài khoản」/「Khóa API」:
//
//  - api_key  → `x-api-key` (the officially supported path)
//  - account  → a Claude subscription setup-token (sk-ant-oat01-…) sent the
//    way Claude Code sends it: Authorization Bearer + oauth beta flags + the
//    Claude Code identity system block. EXPERIMENTAL — not an official API
//    surface; Anthropic can change or reject it at any time, and it must only
//    ever run against the user's OWN subscription.

import type { ChatProxyRequest } from '@nova/shared'
import {
  novaLineStream,
  sseData,
  type ProviderEnv,
  type ResolvedChatRequest,
  type RoundCapture,
  type ToolCallResult,
} from './shared'

export type { NovaStreamEvent, ResolvedChatRequest } from './shared'

const API_ORIGIN = 'https://api.anthropic.com'
const VERSION = '2023-06-01'
/** identity line Claude Code prepends; required for setup-token acceptance */
const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude."

/** beta flag the web_fetch server tool still requires */
const WEB_FETCH_BETA = 'web-fetch-2025-09-10'

export function anthropicHeaders(
  profile: NonNullable<ChatProxyRequest['profile']>,
  opts: { fetchTool?: boolean } = {},
): Record<string, string> {
  const base: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': VERSION,
  }
  const betas = [
    ...(profile.kind === 'account' ? ['oauth-2025-04-20', 'claude-code-20250219'] : []),
    ...(opts.fetchTool ? [WEB_FETCH_BETA] : []),
  ]
  const beta: Record<string, string> = betas.length ? { 'anthropic-beta': betas.join(',') } : {}
  if (profile.kind === 'account') {
    return {
      ...base,
      ...beta,
      authorization: `Bearer ${profile.credential}`,
      'user-agent': 'claude-cli/2.1.0 (external, cli)',
      'x-app': 'cli',
    }
  }
  return { ...base, ...beta, 'x-api-key': profile.credential }
}

/** D1 — provider-native server tools; capped per request so a runaway
 *  agentic search can never burn the user's key unbounded */
const SEARCH_MAX_USES = 5
const FETCH_MAX_USES = 5

export function anthropicTools(
  req: Pick<ResolvedChatRequest, 'search' | 'fetch' | 'novaTools'>,
): Record<string, unknown>[] {
  return [
    ...(req.search
      ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_MAX_USES }]
      : []),
    ...(req.fetch
      ? [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: FETCH_MAX_USES }]
      : []),
    // T5 — Nova-side function tools the worker executes between rounds
    ...(req.novaTools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    })),
  ]
}

/** T5 — the continuation tail for the next round: the captured assistant
 *  turn (thinking blocks keep their signatures) + one user turn carrying
 *  every tool_result */
export function anthropicToolTail(
  round: RoundCapture,
  results: ToolCallResult[],
): unknown[] {
  return [
    { role: 'assistant', content: round.assistantTurn },
    {
      role: 'user',
      content: round.calls.map((c, i) => ({
        type: 'tool_result',
        tool_use_id: c.id,
        content: results[i]?.content ?? '',
        ...(results[i]?.ok === false ? { is_error: true } : {}),
      })),
    },
  ]
}

/** Claude generations on ADAPTIVE thinking + output_config.effort — these
 *  reject `enabled`+`budget_tokens` with a 400. Haiku (all) and pre-4.6
 *  Opus/Sonnet stay on the manual budget path. */
const ADAPTIVE_THINKING =
  /^claude-(opus-4-[6-9]|opus-[5-9]|sonnet-4-[6-9]|sonnet-[5-9]|fable|mythos)/

const THINKING_BUDGET = { low: 2048, normal: 8192, high: 16384 } as const
const THINKING_EFFORT = { low: 'low', normal: 'medium', high: 'high' } as const

/** an ephemeral prompt-cache breakpoint — Anthropic caches the prefix up to
 *  and including the marked block; reads cost 0.1× input, writes 1.25×. Below
 *  the model minimum (1024 tok, 2048 for Haiku) it is silently ignored. */
const CACHE = { type: 'ephemeral' } as const

export function anthropicBody(req: ResolvedChatRequest): string {
  // NOTE: no temperature/top_p/top_k — models ≥4.7 reject sampling params,
  // and extended thinking is incompatible with them anyway
  const system: { type: 'text'; text: string; cache_control?: typeof CACHE }[] = []
  if (req.profile.kind === 'account') system.push({ type: 'text', text: CLAUDE_CODE_IDENTITY })
  if (req.system?.trim()) system.push({ type: 'text', text: req.system })
  // prompt caching: the system prompt is byte-identical every turn — mark its
  // last block so persona + project instructions + CLI identity read from
  // cache on every follow-up instead of billing full input each time
  if (system.length) system[system.length - 1].cache_control = CACHE
  // B5 — thinking: 'off'/absent sends nothing (provider default: no extended
  // thinking on budget models; adaptive models decide per request)
  const level = req.thinking && req.thinking !== 'off' ? req.thinking : null
  const adaptive = ADAPTIVE_THINKING.test(req.model)
  const budget = level && !adaptive ? THINKING_BUDGET[level] : 0
  const maxTokens = req.maxTokens ?? (level === 'high' ? 16384 : 8192)
  const tools = anthropicTools(req)
  // tool schemas are stable across a conversation — cache them too (the
  // breakpoint on the last tool covers the whole tools array)
  if (tools.length) tools[tools.length - 1].cache_control = CACHE
  // B1/T5 — turns as native blocks; a breakpoint on the LAST message's final
  // block caches the growing conversation prefix (read cheap next round/turn)
  const messages: { role: string; content: unknown }[] = req.messages.map((m) => ({
    role: m.role as string,
    content: m.parts?.length
      ? [
          ...m.parts.map((p) =>
            p.type === 'image'
              ? {
                  type: 'image',
                  source: p.url
                    ? { type: 'url', url: p.url }
                    : { type: 'base64', media_type: p.mime, data: p.base64 ?? '' },
                }
              : {
                  type: 'document',
                  source: p.url
                    ? { type: 'url', url: p.url }
                    : { type: 'base64', media_type: 'application/pdf', data: p.base64 ?? '' },
                },
          ),
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
        ]
      : (m.content as unknown),
  }))
  messages.push(...((req.rawTail ?? []) as { role: string; content: unknown }[]))
  const tail = messages[messages.length - 1] as { role: string; content: unknown } | undefined
  if (tail) {
    if (typeof tail.content === 'string')
      tail.content = [{ type: 'text', text: tail.content, cache_control: CACHE }]
    else if (Array.isArray(tail.content) && tail.content.length) {
      const blocks = tail.content as Record<string, unknown>[]
      blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: CACHE }
    }
  }
  return JSON.stringify({
    model: req.model,
    ...(tools.length ? { tools } : {}),
    // budget_tokens must stay BELOW max_tokens — widen the ceiling when needed
    max_tokens: budget ? Math.max(maxTokens, budget + 8192) : maxTokens,
    stream: true,
    ...(level && adaptive
      ? { thinking: { type: 'adaptive' }, output_config: { effort: THINKING_EFFORT[level] } }
      : {}),
    ...(budget ? { thinking: { type: 'enabled', budget_tokens: budget } } : {}),
    ...(system.length ? { system } : {}),
    messages,
  })
}

/** call the upstream with streaming enabled; the caller owns the response body.
 *  ANTHROPIC_BASE_URL (an AI Gateway prefix) replaces the origin when Workers
 *  egress is rejected — headers and body are identical either way. */
export function callAnthropic(
  req: ResolvedChatRequest,
  signal?: AbortSignal,
  env: ProviderEnv = {},
): Promise<Response> {
  const origin = (env.ANTHROPIC_BASE_URL ?? API_ORIGIN).replace(/\/+$/, '')
  return fetch(`${origin}/v1/messages`, {
    method: 'POST',
    headers: anthropicHeaders(req.profile, { fetchTool: !!req.fetch }),
    body: anthropicBody(req),
    signal,
  })
}

interface AnthropicUsage {
  input_tokens?: number
  output_tokens?: number
  /** prompt-caching tokens live in their OWN fields — input_tokens does NOT
   *  include them; both bill (at different rates) and must be metered */
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

interface AnthropicEvent {
  type?: string
  message?: { usage?: AnthropicUsage }
  usage?: AnthropicUsage
  delta?: {
    type?: string
    text?: string
    thinking?: string
    partial_json?: string
    signature?: string
    /** citations_delta — one citation to attach to the CURRENT text block */
    citation?: { cited_text?: string; url?: string; title?: string }
  }
  content_block?: {
    type?: string
    id?: string
    name?: string
    tool_use_id?: string
    content?: unknown
  }
  error?: { type?: string; message?: string }
}

/** rows of a web_search/web_fetch tool-result block → Nova sources */
function blockSources(content: unknown, nFrom: number): { n: number; url: string; title: string }[] {
  const rows = Array.isArray(content) ? content : [content]
  const out: { n: number; url: string; title: string }[] = []
  for (const row of rows) {
    const r = row as { url?: unknown; title?: unknown } | null
    if (r && typeof r.url === 'string')
      out.push({ n: nFrom + out.length, url: r.url, title: typeof r.title === 'string' ? r.title : r.url })
  }
  return out
}

/** an *_tool_result block whose content is an error object, not a row list */
function blockError(content: unknown): string | null {
  const c = content as { type?: unknown; error_code?: unknown } | null
  if (c && typeof c.type === 'string' && c.type.endsWith('_error'))
    return typeof c.error_code === 'string' ? c.error_code : 'tool_error'
  return null
}

/** total input-side tokens — base prompt + cache writes + cache reads */
function inputSideTokens(u: AnthropicUsage | undefined): number {
  return (u?.input_tokens ?? 0) + (u?.cache_creation_input_tokens ?? 0) + (u?.cache_read_input_tokens ?? 0)
}

/**
 * Transform the Anthropic SSE stream into Nova's event contract:
 * message_start · block_delta{text} · thinking_delta{text} ·
 * message_stop{usage} · error. Extended-thinking deltas stream as
 * thinking_delta so the client can render live reasoning; signature
 * deltas are integrity plumbing and never reach the client.
 */
export function toNovaStream(
  upstream: ReadableStream<Uint8Array>,
  round?: RoundCapture,
): ReadableStream<Uint8Array> {
  let inputTokens = 0
  let outputTokens = 0
  // the OPEN server_tool_use block — input_json_delta belongs to a tool only
  // while one is open, so stray deltas of other block kinds never leak out
  let openToolId: string | null = null
  let sourceN = 0
  // T5 capture — assistant blocks rebuilt verbatim for the continuation
  // (thinking keeps its signature; tool_use keeps its full input)
  const blocks: Record<string, unknown>[] = []
  let cur: Record<string, unknown> | null = null
  let curArgs = ''
  // citation offsets are computed against the ONE continuous stream of
  // block_delta text this turn — the exact string the client accumulates.
  // A turn can carry more than one text content block (e.g. a lead-in
  // before a tool call, then the final answer); blockStartOffset anchors
  // each new block's local text to its place in that shared coordinate space.
  let emittedTotal = 0
  let blockStartOffset = 0
  let blockText = ''
  let citeSearchFrom = 0
  // web_search_result_location citations carry url/title but no numeric
  // index, so sources already surfaced this turn are looked up by url
  const sourceNByUrl = new Map<string, number>()

  return novaLineStream(upstream, {
    line(line, emit) {
      const raw = sseData(line)
      if (!raw) return
      let evt: AnthropicEvent
      try {
        evt = JSON.parse(raw) as AnthropicEvent
      } catch {
        return
      }
      switch (evt.type) {
        case 'message_start':
          inputTokens = inputSideTokens(evt.message?.usage)
          emit({ type: 'message_start' })
          break
        case 'content_block_start': {
          const block = evt.content_block
          if (round && block) {
            cur = { ...(block as Record<string, unknown>) }
            curArgs = ''
            blocks.push(cur)
          }
          if (block?.type === 'text') {
            blockStartOffset = emittedTotal
            blockText = ''
            citeSearchFrom = 0
          }
          if (
            (block?.type === 'server_tool_use' || block?.type === 'tool_use') &&
            typeof block.id === 'string'
          ) {
            openToolId = block.id
            emit({ type: 'tool_start', id: block.id, name: block.name ?? 'tool' })
          } else if (
            (block?.type === 'web_search_tool_result' || block?.type === 'web_fetch_tool_result') &&
            typeof block.tool_use_id === 'string'
          ) {
            const error = blockError(block.content)
            const sources = error ? [] : blockSources(block.content, sourceN + 1)
            sourceN += sources.length
            for (const s of sources) sourceNByUrl.set(s.url, s.n)
            emit({
              type: 'tool_result',
              id: block.tool_use_id,
              ok: !error,
              ...(error ? { summary: error } : {}),
              ...(sources.length ? { sources } : {}),
            })
          }
          break
        }
        case 'content_block_stop':
          if (round && cur) {
            // streamed JSON becomes the block's final input (both tool kinds
            // replay with it); only the model's OWN calls queue for execution
            if (cur.type === 'tool_use' || cur.type === 'server_tool_use') {
              try {
                cur.input = curArgs ? (JSON.parse(curArgs) as unknown) : {}
              } catch {
                cur.input = {}
              }
              if (cur.type === 'tool_use')
                round.calls.push({ id: String(cur.id), name: String(cur.name), args: curArgs || '{}' })
            }
            cur = null
          }
          openToolId = null
          break
        case 'content_block_delta': {
          const d = evt.delta
          if (d?.type === 'text_delta' && d.text) {
            if (cur) cur.text = String(cur.text ?? '') + d.text
            emit({ type: 'block_delta', text: d.text })
            blockText += d.text
            emittedTotal += d.text.length
          } else if (d?.type === 'citations_delta' && d.citation?.cited_text) {
            const citedText = d.citation.cited_text
            const idx = blockText.indexOf(citedText, citeSearchFrom)
            if (idx !== -1) {
              citeSearchFrom = idx + citedText.length
              emit({
                type: 'citation',
                citeStart: blockStartOffset + idx,
                citeEnd: blockStartOffset + idx + citedText.length,
                citeText: citedText,
                ...(d.citation.url && sourceNByUrl.has(d.citation.url)
                  ? { citeSource: sourceNByUrl.get(d.citation.url) }
                  : {}),
              })
            }
          } else if (d?.type === 'thinking_delta' && d.thinking) {
            if (cur) cur.thinking = String(cur.thinking ?? '') + d.thinking
            emit({ type: 'thinking_delta', text: d.thinking })
          } else if (d?.type === 'signature_delta' && d.signature) {
            if (cur) cur.signature = String(cur.signature ?? '') + d.signature
          } else if (d?.type === 'input_json_delta' && d.partial_json && openToolId) {
            curArgs += d.partial_json
            emit({ type: 'tool_delta', id: openToolId, text: d.partial_json })
          }
          break
        }
        case 'message_delta':
          outputTokens = evt.usage?.output_tokens ?? outputTokens
          // final message_delta can restate input-side usage (cache fields)
          if (evt.usage && inputSideTokens(evt.usage) > inputTokens)
            inputTokens = inputSideTokens(evt.usage)
          break
        case 'message_stop':
          if (round) round.assistantTurn = blocks
          emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
          break
        case 'error':
          emit({
            type: 'error',
            code: evt.error?.type ?? 'upstream_error',
            message: evt.error?.message ?? 'Provider stream error',
          })
          break
      }
    },
  })
}
