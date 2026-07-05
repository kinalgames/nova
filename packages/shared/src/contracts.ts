// Domain contracts shared verbatim between the web client and the API.
// These shapes are proven by the shipped UI (271 unit + 12 e2e tests) and
// become the single source of truth for `apps/api` tables and payloads.

export type ProviderId = 'claude' | 'gemini' | 'openai' | 'ollama'

/** credential kinds a provider accepts — 「Tài khoản」/「Khóa API」 */
export type ProfileKind = 'account' | 'api_key'

/** credential kinds each provider accepts, in the order the add-menu offers
 *  them — the single source for both the client menu and the proxy's
 *  validation. For ollama the api_key slot carries the endpoint URL. */
// Gemini's 'account' kind (Google OAuth → Code Assist / cloudcode-pa) is
// RETIRED (2026-07-05): Google sunset consumer-tier Code Assist access on
// 2026-06-18, and separately treats third-party reuse of gemini-cli's OAuth
// client as a Terms-of-Service violation — real accounts have been banned
// for exactly this pattern. Gemini now ships api_key only. Claude's
// 'account' kind (Claude Code setup-token) is unrelated and unaffected.
export const providerAuth: Record<ProviderId, readonly ProfileKind[]> = {
  claude: ['account', 'api_key'],
  gemini: ['api_key'],
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

/** B7 — one live-sync frame pushed by the user's Durable Object over the
 *  hibernating WebSocket. `hello` announces the head seq on connect (a
 *  cursor behind it pulls the delta). `ops` is a batch someone just applied:
 *  a client whose cursor equals `from` applies it directly; anyone else
 *  pulls GET /v1/sync?since=cursor. `src` echoes the pusher's per-tab id so
 *  the origin tab skips its own echo. */
export type SyncWsFrame =
  | { type: 'hello'; seq: number }
  | { type: 'ops'; from: number; seq: number; src?: string; ops: SyncOp[] }

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
  /** D1 — enable the provider-NATIVE web search tool (Anthropic web_search,
   *  Gemini google_search grounding). Only sent when the model's caps carry
   *  webSearch; the provider bills the user's own key. */
  search?: boolean
  /** D1 — enable the provider-native URL fetch tool (Anthropic web_fetch,
   *  Gemini url_context). Same capability gate as `search`. */
  fetch?: boolean
  /** D1/T5 — advertise the Nova `files` function tool (read the user's
   *  uploads); requires a model with toolUse. The worker runs the agentic
   *  loop when set. */
  files?: boolean
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

/** what a model can DO — drives capability-gated UX (thinking chip, upload
 *  affordances, future tool wiring). Extend as new surfaces need it. */
export interface ModelCaps {
  /** extended thinking / reasoning — gates the “Suy nghĩ” chip + `thinking` */
  reasoning?: boolean
  /** image input */
  vision?: boolean
  /** audio input */
  audio?: boolean
  /** video input */
  video?: boolean
  /** image generation */
  imageGen?: boolean
  /** function calling / tool use — foundation for real web/fetch/files/bash */
  toolUse?: boolean
  /** provider-NATIVE web search / grounding tool — D1 routes search here
   *  when available instead of Nova's own search pipeline */
  webSearch?: boolean
}

export interface ModelDef {
  /** canonical id — globally unique across providers */
  id: string
  /** display name */
  name: string
  /** routing class — which slot picker lists this model */
  mode: 'smart' | 'fast'
  caps: ModelCaps
  /** context window, tokens */
  ctx: number
  /** max output tokens per reply (absent = unknown — never guessed) */
  maxOut?: number
  /** USD per 1M input tokens */
  inPrice: number
  /** USD per 1M output tokens */
  outPrice: number
  /** USD per 1M cache-READ input tokens (absent = provider has no cache or
   *  price unverified; the meter then bills them as plain input) */
  cacheReadPrice?: number
  /** USD per 1M cache-WRITE input tokens */
  cacheWritePrice?: number
  /** iconic/user-favourite older model — badged and sorted last */
  legacy?: boolean
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
