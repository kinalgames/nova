// Fake "assistant" service — deterministic-ish but varied replies that behave
// like a real streaming chat backend (no network). Keeps the UI honest: the
// composer drives real exchanges, streamed token-by-token.

import type { SlotId } from '../data/defs'
import type { ThinkLevel } from '../state/types'
import { getSeed } from '../data/seed'

export interface ReplyOptions {
  /** which quality slot the chat routes through — “smart” answers more thoroughly */
  slot: SlotId
  thinking: ThinkLevel
  project: string
  /** project instructions (the project description) — steer the reply voice */
  instructions?: string
}

let seed = 1
function pick<T>(arr: T[]): T {
  // tiny LCG so replies vary across calls but stay deterministic within a run
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return arr[seed % arr.length]
}

/** Reset the variation seed (tests want determinism). */
export function resetReplySeed(s = 1) {
  seed = s
}

/** Compose a contextual reply for a user message — locale-aware demo corpus. */
export function composeReply(userText: string, opts: ReplyOptions): string {
  const corpus = getSeed().replies
  const group = corpus.templates.find((t) => t.match.test(userText))
  let body = group ? pick(group.replies) : pick(corpus.fallbacks)
  body = body.replace('{project}', opts.project)
  // the smart slot answers a touch more thoroughly than the fast one
  if (opts.slot === 'smart' && opts.thinking !== 'off') {
    body += ` ${corpus.smartSuffix}`
  }
  // project instructions visibly steer the fake reply — the real backend will
  // inject them into the system prompt with the same contract
  if (opts.instructions?.trim()) {
    body += ` ${corpus.instructionsNote.replace('{project}', opts.project)}`
  }
  return body
}

/** ms the assistant "thinks" before the first token, by thinking level. */
export function thinkingDelay(level: ThinkLevel): number {
  return { off: 0, low: 280, normal: 650, high: 1200 }[level]
}

/** rough token estimate for the fake usage meter (≈ 4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}
