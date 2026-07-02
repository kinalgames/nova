// Domain contracts shared verbatim between the web client and the API.
// These shapes are proven by the shipped UI (271 unit + 12 e2e tests) and
// become the single source of truth for `apps/api` tables and payloads.

export type ProviderId = 'claude' | 'gemini' | 'openai' | 'ollama'

/** credential kinds a provider accepts — 「Tài khoản」/「Khóa API」 */
export type ProfileKind = 'account' | 'api_key'

/** lifecycle of an auth profile: usable → rate-limited → broken → unverified */
export type ProfileStatus = 'active' | 'limited' | 'error' | 'untested'

/** one credential a provider can be reached through */
export interface AuthProfile {
  id: string
  /** user-given label */
  name: string
  kind: ProfileKind
  /** masked key, account email, or endpoint URL (server: encrypted at rest) */
  credential: string
  status: ProfileStatus
  /** epoch ms when a 'limited' profile becomes usable again */
  limitedUntil?: number
  /** seeded showcase credential — never routed to a real provider */
  demo?: boolean
}

/** one turn of a chat request as the provider proxy consumes it */
export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** request body of POST /v1/chat — the provider proxy contract */
export interface ChatProxyRequest {
  providerId: ProviderId
  model: string
  system?: string
  messages: ChatTurn[]
  maxTokens?: number
  profile: { kind: ProfileKind; credential: string }
}

/** the two quality slots chats route through — cross-provider */
export type SlotId = 'smart' | 'fast'

export interface ModelRef {
  providerId: ProviderId
  modelId: string
}

export interface ModelDef {
  /** canonical id — globally unique across providers */
  id: string
  /** display name */
  name: string
  /** USD per 1M input tokens */
  inPrice: number
  /** USD per 1M output tokens */
  outPrice: number
  /** stream pace — ms between tokens (client fake layer; advisory server-side) */
  pace: number
}

/** token usage recorded on an assistant reply */
export interface MsgUsage {
  inputTokens: number
  outputTokens: number
  modelId: string
  profileId: string
  /** epoch ms when the reply completed */
  at?: number
}
