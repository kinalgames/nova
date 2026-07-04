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
import { novaLineStream, sseData, type ResolvedChatRequest } from './shared'

export type { NovaStreamEvent, ResolvedChatRequest } from './shared'

const API_URL = 'https://api.anthropic.com/v1/messages'
const VERSION = '2023-06-01'
/** identity line Claude Code prepends; required for setup-token acceptance */
const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude."

export function anthropicHeaders(
  profile: NonNullable<ChatProxyRequest['profile']>,
): Record<string, string> {
  const base: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': VERSION,
  }
  if (profile.kind === 'account') {
    return {
      ...base,
      authorization: `Bearer ${profile.credential}`,
      'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219',
      'user-agent': 'claude-cli/2.1.0 (external, cli)',
      'x-app': 'cli',
    }
  }
  return { ...base, 'x-api-key': profile.credential }
}

/** Claude generations on ADAPTIVE thinking + output_config.effort — these
 *  reject `enabled`+`budget_tokens` with a 400. Haiku (all) and pre-4.6
 *  Opus/Sonnet stay on the manual budget path. */
const ADAPTIVE_THINKING =
  /^claude-(opus-4-[6-9]|opus-[5-9]|sonnet-4-[6-9]|sonnet-[5-9]|fable|mythos)/

const THINKING_BUDGET = { low: 2048, normal: 8192, high: 16384 } as const
const THINKING_EFFORT = { low: 'low', normal: 'medium', high: 'high' } as const

export function anthropicBody(req: ResolvedChatRequest): string {
  // NOTE: no temperature/top_p/top_k — models ≥4.7 reject sampling params,
  // and extended thinking is incompatible with them anyway
  const system: { type: 'text'; text: string }[] = []
  if (req.profile.kind === 'account') system.push({ type: 'text', text: CLAUDE_CODE_IDENTITY })
  if (req.system?.trim()) system.push({ type: 'text', text: req.system })
  // B5 — thinking: 'off'/absent sends nothing (provider default: no extended
  // thinking on budget models; adaptive models decide per request)
  const level = req.thinking && req.thinking !== 'off' ? req.thinking : null
  const adaptive = ADAPTIVE_THINKING.test(req.model)
  const budget = level && !adaptive ? THINKING_BUDGET[level] : 0
  const maxTokens = req.maxTokens ?? (level === 'high' ? 16384 : 8192)
  return JSON.stringify({
    model: req.model,
    // budget_tokens must stay BELOW max_tokens — widen the ceiling when needed
    max_tokens: budget ? Math.max(maxTokens, budget + 8192) : maxTokens,
    stream: true,
    ...(level && adaptive
      ? { thinking: { type: 'adaptive' }, output_config: { effort: THINKING_EFFORT[level] } }
      : {}),
    ...(budget ? { thinking: { type: 'enabled', budget_tokens: budget } } : {}),
    ...(system.length ? { system } : {}),
    // B1 — binary parts render as native image/document blocks before the text
    messages: req.messages.map((m) => ({
      role: m.role,
      content: m.parts?.length
        ? [
            ...m.parts.map((p) =>
              p.type === 'image'
                ? { type: 'image', source: { type: 'base64', media_type: p.mime, data: p.base64 } }
                : {
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: p.base64 },
                  },
            ),
            ...(m.content ? [{ type: 'text', text: m.content }] : []),
          ]
        : m.content,
    })),
  })
}

/** call the upstream with streaming enabled; the caller owns the response body */
export function callAnthropic(req: ResolvedChatRequest, signal?: AbortSignal): Promise<Response> {
  return fetch(API_URL, {
    method: 'POST',
    headers: anthropicHeaders(req.profile),
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
  delta?: { type?: string; text?: string }
  error?: { type?: string; message?: string }
}

/** total input-side tokens — base prompt + cache writes + cache reads */
function inputSideTokens(u: AnthropicUsage | undefined): number {
  return (u?.input_tokens ?? 0) + (u?.cache_creation_input_tokens ?? 0) + (u?.cache_read_input_tokens ?? 0)
}

/**
 * Transform the Anthropic SSE stream into Nova's event contract:
 * message_start · block_delta{text} · message_stop{usage} · error.
 */
export function toNovaStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let inputTokens = 0
  let outputTokens = 0

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
        case 'content_block_delta':
          if (evt.delta?.type === 'text_delta' && evt.delta.text)
            emit({ type: 'block_delta', text: evt.delta.text })
          break
        case 'message_delta':
          outputTokens = evt.usage?.output_tokens ?? outputTokens
          // final message_delta can restate input-side usage (cache fields)
          if (evt.usage && inputSideTokens(evt.usage) > inputTokens)
            inputTokens = inputSideTokens(evt.usage)
          break
        case 'message_stop':
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
