// Domain contracts shared verbatim between the web client and the API.
// These shapes are proven by the shipped UI (271 unit + 12 e2e tests) and
// become the single source of truth for `apps/api` tables and payloads.

export type ProviderId = 'claude' | 'gemini' | 'openai' | 'ollama'

/** credential kinds a provider accepts — 「Tài khoản」/「Khóa API」 */
export type ProfileKind = 'account' | 'api_key'

/** credential kinds each provider accepts, in the order the add-menu offers
 *  them — the single source for both the client menu and the proxy's
 *  validation. For ollama the api_key slot carries the endpoint URL. */
export const providerAuth: Record<ProviderId, readonly ProfileKind[]> = {
  claude: ['account', 'api_key'],
  gemini: ['account', 'api_key'],
  openai: ['api_key'],
  ollama: ['api_key'],
}

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
  /** BE3: lives sealed on the server — `credential` holds only the …tail hint;
   *  chats reference it by id (credentialId), the secret never re-enters the client */
  server?: boolean
}

/** one turn of a chat request as the provider proxy consumes it */
export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  /** B1 — server-side attachment refs (≤4/turn). The proxy resolves them
   *  owner-checked from R2 into provider-ready parts; the client never
   *  ships bytes through the chat request. */
  attachments?: { id: string }[]
}

/** tables the sync protocol carries — record-level op-log (BE2) */
export type SyncTable = 'settings' | 'project' | 'conversation' | 'thread'

/** one record-level operation in the per-user op-log */
export interface SyncOp {
  kind: 'put' | 'del'
  table: SyncTable
  /** record id ('settings' is a singleton; thread ids = conversation ids) */
  id: string
  /** JSON value for put; absent for del */
  value?: unknown
  /** client wall-clock ms (informational; server seq is authoritative) */
  at: number
}

export interface SyncPullResponse {
  seq: number
  ops: SyncOp[]
}

/** request body of POST /v1/chat — the provider proxy contract.
 *  Exactly ONE of `credentialId` (BE3: server-side sealed BYOK, requires a
 *  session) or `profile` (transitional: client-held credential in transit)
 *  must be present. */
/** reasoning depth the user picked — the composer's “Suy nghĩ” chip */
export type ThinkingLevel = 'off' | 'low' | 'normal' | 'high'

export interface ChatProxyRequest {
  providerId: ProviderId
  model: string
  system?: string
  messages: ChatTurn[]
  maxTokens?: number
  /** reasoning depth — adapters map it to each provider's native control
   *  (Anthropic adaptive/budget thinking, Gemini thinkingConfig, OpenAI
   *  reasoning_effort). Absent = provider default. */
  thinking?: ThinkingLevel
  /** id of a stored server-side credential owned by the session user */
  credentialId?: string
  /** transitional client-held credential — retired once BYOK v2 ships */
  profile?: { kind: ProfileKind; credential: string }
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

/** one row of the month roll-up returned by GET /v1/usage (T8) */
export interface UsageRow {
  providerId: ProviderId
  modelId: string
  kind: ProfileKind
  inTok: number
  outTok: number
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
