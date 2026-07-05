import i18n from '../i18n'

/** innermost human message inside a (possibly nested / double-encoded)
 *  provider error body — `{"error":{"message":"…"}}`, `{"message":"…"}`,
 *  `{"detail":"{\"error\":…}"}` all resolve to the leaf string */
function dig(v: unknown): string | null {
  if (typeof v === 'string') {
    const s = v.trim()
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        return dig(JSON.parse(s)) ?? s
      } catch {
        return s
      }
    }
    return s
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return (
      (o.error !== undefined ? dig(o.error) : null) ??
      (typeof o.message === 'string' ? o.message : null) ??
      (o.detail !== undefined ? dig(o.detail) : null)
    )
  }
  return null
}

/** One human sentence for the chat error card. Providers answer with nested
 *  JSON (`{"error":{"type":"forbidden","message":"Request not allowed"}}`) —
 *  raw JSON reads like a stack trace to users. Known failure classes get a
 *  Vietnamese-first explanation; anything else shows the innermost message. */
export function humanErrorDetail(code: string, message: string, status?: number): string {
  const msg = dig(message) ?? message
  const low = msg.toLowerCase()
  if (status === 403 || low.includes('not allowed') || low.includes('unsupported_country'))
    return `${i18n.t('chat.errRegion')} · ${msg}`
  // Gemini's Google-account transport (Code Assist): the newest models are
  // gated behind a Google subscription tier — the account signs in fine but
  // the model call itself 404s. Detected on message text (the upstream
  // status stays a generic 404, not a dedicated code) — verified against
  // real gemini-cli reports of the identical failure.
  if (low.includes('requested entity was not found'))
    return `${i18n.t('chat.errGeminiEntitlement')} · ${msg}`
  if (
    status === 401 ||
    code === 'invalid_credential' ||
    low.includes('invalid x-api-key') ||
    low.includes('incorrect api key') ||
    low.includes('invalid token') ||
    low.includes('token expired')
  )
    return `${i18n.t('chat.errAuth')} · ${msg}`
  if (status === 429 || code === 'rate_limited') return `${i18n.t('chat.errRate')} · ${msg}`
  if (status === 529 || low.includes('overloaded')) return `${i18n.t('chat.errOverloaded')} · ${msg}`
  if (code === 'credential_not_found') return i18n.t('chat.errCredGone')
  if (code === 'unauthenticated') return i18n.t('chat.errSession')
  if (code === 'network' || msg === 'network') return i18n.t('chat.errNetwork')
  // unknown class: a plain-words lead, the technical tail kept small for devs
  return `${i18n.t('chat.errGeneric')} · ${code}: ${msg}`
}
