// D3 — auto-naming a conversation after its first completed reply.
// Reuses the /v1/chat proxy (same BYOK credential, rate limits and usage
// metering as the chat itself) with the CHEAPEST whitelisted model of the
// provider in use — a title needs speed, not depth.

import type { ChatProxyRequest, ProviderId } from '@nova/shared'
import { streamChat } from './llm'

/** cheapest whitelisted model per provider; providers without a cheaper
 *  sibling in the catalog (ollama) reuse the chat's own model */
export const TITLE_MODEL: Partial<Record<ProviderId, string>> = {
  claude: 'claude-haiku-4-5',
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-5.4-mini',
}

const INSTRUCTION =
  'Name this conversation: reply with ONLY a concise 3-8 word title, in the same language the user writes in. No quotes, no trailing punctuation.'

/** first non-empty line, unquoted, capped at the sidebar's 48 chars */
export function sanitizeTitle(raw: string): string | null {
  const line = (raw.split('\n').find((l) => l.trim()) ?? '')
    .trim()
    .replace(/^["'“«]+|["'”»]+$/g, '')
    .trim()
  if (!line) return null
  return line.length > 48 ? `${line.slice(0, 48)}…` : line
}

/**
 * Generate a title from the opening exchange. Resolves to null on ANY
 * failure — the caller keeps the muted “Untitled” and the next completed
 * reply simply tries again.
 */
export async function generateTitle(opts: {
  providerId: ProviderId
  model: string
  /** same credential source the chat itself used (stored id or inline) */
  credential: Pick<ChatProxyRequest, 'credentialId' | 'profile'>
  userText: string
  replyText: string
}): Promise<string | null> {
  let acc = ''
  let failed = false
  await streamChat(
    {
      providerId: opts.providerId,
      model: TITLE_MODEL[opts.providerId] ?? opts.model,
      system: INSTRUCTION,
      thinking: 'off',
      // roomy enough for reasoning models whose internal tokens count toward
      // the completion cap (gpt-5 'minimal' still spends a few)
      maxTokens: 64,
      messages: [
        {
          role: 'user',
          content: `${opts.userText.slice(0, 500)}\n\n---\n\n${opts.replyText.slice(0, 500)}`,
        },
      ],
      ...opts.credential,
    },
    {
      onDelta: (t) => {
        acc += t
      },
      onDone: () => {},
      onError: () => {
        failed = true
      },
    },
  )
  return failed ? null : sanitizeTitle(acc)
}
