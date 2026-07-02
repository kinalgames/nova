// Gemini adapter — two credential kinds, matching 「Tài khoản」/「Khóa API」:
//
//  - api_key  → `x-goog-api-key` against generativelanguage.googleapis.com
//    (the officially supported path)
//  - account  → the Gemini Code Assist transport that gemini-cli itself uses:
//    a Google OAuth user credential sent Bearer to cloudcode-pa.googleapis.com,
//    with the project discovered via `loadCodeAssist`. EXPERIMENTAL — not an
//    official API surface; it must only ever run against the user's OWN Google
//    account. The credential is accepted as an access token (ya29…), a refresh
//    token (1//…), or the full ~/.gemini/oauth_creds.json blob (refresh token
//    preferred — access tokens expire within the hour).

import {
  ProviderConfigError,
  novaLineStream,
  sseData,
  type ProviderEnv,
  type ResolvedChatRequest,
} from './shared'

const GENLANG_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const CODE_ASSIST_BASE = 'https://cloudcode-pa.googleapis.com/v1internal'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// The refresh flow replays gemini-cli's OAuth "installed application" client
// (published in packages/core/src/code_assist/oauth2.ts — per Google's
// installed-app model the pair is not actually secret). The values come from
// worker config (GEMINI_OAUTH_CLIENT_ID / GEMINI_OAUTH_CLIENT_SECRET) so no
// secret-shaped literal lives in source — see ProviderEnv.

/** the GenerateContentRequest both Gemini transports share */
export function geminiRequest(req: ResolvedChatRequest): Record<string, unknown> {
  return {
    contents: req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    ...(req.system?.trim() ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    generationConfig: { maxOutputTokens: req.maxTokens ?? 8192 },
  }
}

type TokenSource = { accessToken: string } | { refreshToken: string }

/** classify an account credential; throws ProviderConfigError when unusable */
export function parseAccountCredential(credential: string): TokenSource {
  const c = credential.trim()
  if (c.startsWith('{')) {
    let parsed: { access_token?: unknown; refresh_token?: unknown }
    try {
      parsed = JSON.parse(c) as typeof parsed
    } catch {
      throw new ProviderConfigError('Gemini account credential is not valid JSON')
    }
    if (typeof parsed.refresh_token === 'string' && parsed.refresh_token)
      return { refreshToken: parsed.refresh_token }
    if (typeof parsed.access_token === 'string' && parsed.access_token)
      return { accessToken: parsed.access_token }
    throw new ProviderConfigError(
      'Gemini account JSON carries neither refresh_token nor access_token',
    )
  }
  if (c.startsWith('1//')) return { refreshToken: c }
  if (c) return { accessToken: c }
  throw new ProviderConfigError('Gemini account credential is empty')
}

/** a pre-flight step either yields a value or the Response to surface as-is */
type Step<T> = T | { fail: Response }
const failed = <T>(step: Step<T>): step is { fail: Response } =>
  typeof step === 'object' && step !== null && 'fail' in step

async function fetchAccessToken(
  source: TokenSource,
  env: ProviderEnv,
  signal?: AbortSignal,
): Promise<Step<{ token: string }>> {
  if ('accessToken' in source) return { token: source.accessToken }
  if (!env.GEMINI_OAUTH_CLIENT_ID || !env.GEMINI_OAUTH_CLIENT_SECRET)
    throw new ProviderConfigError(
      'Server is missing GEMINI_OAUTH_CLIENT_ID/GEMINI_OAUTH_CLIENT_SECRET — set them in .dev.vars (dev) or wrangler secret put (prod), values are in the gemini-cli repo',
    )
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GEMINI_OAUTH_CLIENT_ID,
      client_secret: env.GEMINI_OAUTH_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: source.refreshToken,
    }).toString(),
    signal,
  })
  if (!res.ok) return { fail: res }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token)
    return {
      fail: Response.json(
        { error: { message: 'Google token refresh returned no access_token' } },
        { status: 502 },
      ),
    }
  return { token: data.access_token }
}

async function discoverProject(
  token: string,
  signal?: AbortSignal,
): Promise<Step<{ project: string }>> {
  const res = await fetch(`${CODE_ASSIST_BASE}:loadCodeAssist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' },
    }),
    signal,
  })
  if (!res.ok) return { fail: res }
  const data = (await res.json()) as { cloudaicompanionProject?: string }
  if (!data.cloudaicompanionProject)
    return {
      fail: Response.json(
        {
          error: {
            message:
              'Google account has no Gemini Code Assist project yet — log in with gemini-cli once to onboard, then retry.',
          },
        },
        { status: 412 },
      ),
    }
  return { project: data.cloudaicompanionProject }
}

/** call the upstream with streaming enabled; the caller owns the response body */
export async function callGemini(
  req: ResolvedChatRequest,
  signal?: AbortSignal,
  env: ProviderEnv = {},
): Promise<Response> {
  if (req.profile.kind === 'api_key') {
    return fetch(
      `${GENLANG_BASE}/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': req.profile.credential },
        body: JSON.stringify(geminiRequest(req)),
        signal,
      },
    )
  }
  const source = parseAccountCredential(req.profile.credential)
  const tokenStep = await fetchAccessToken(source, env, signal)
  if (failed(tokenStep)) return tokenStep.fail
  const projectStep = await discoverProject(tokenStep.token, signal)
  if (failed(projectStep)) return projectStep.fail
  return fetch(`${CODE_ASSIST_BASE}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenStep.token}` },
    body: JSON.stringify({
      model: req.model,
      project: projectStep.project,
      request: geminiRequest(req),
    }),
    signal,
  })
}

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
  }
  error?: { code?: number; message?: string; status?: string }
}

/**
 * Transform the Gemini SSE stream into Nova's event contract. Handles both
 * the plain GenerateContentResponse chunks (api_key path) and the Code Assist
 * envelope `{response: …}` (account path). Gemini has no explicit stop event —
 * message_stop is emitted when the upstream closes, carrying the final usage
 * (thought tokens bill as output, so they count toward outputTokens).
 */
export function toNovaStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let started = false
  let errored = false
  let inputTokens = 0
  let outputTokens = 0

  return novaLineStream(upstream, {
    line(line, emit) {
      const raw = sseData(line)
      if (!raw) return
      let parsed: GeminiChunk & { response?: GeminiChunk }
      try {
        parsed = JSON.parse(raw) as typeof parsed
      } catch {
        return
      }
      const chunk = parsed.response ?? parsed
      const error = parsed.error ?? chunk.error
      if (error) {
        errored = true
        emit({
          type: 'error',
          code: error.status ?? 'upstream_error',
          message: error.message ?? 'Provider stream error',
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
        for (const part of parts)
          if (typeof part.text === 'string' && part.text)
            emit({ type: 'block_delta', text: part.text })
    },
    flush(emit) {
      if (!errored) emit({ type: 'message_stop', usage: { inputTokens, outputTokens } })
    },
  })
}
