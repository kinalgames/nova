// B1 — turn attachment REFS into provider-ready parts, owner-checked.
// Text/code files fold straight into the turn's text (every model reads
// text); images and PDFs become binary parts each adapter renders in its
// own wire format — or degrades into a bracketed note when it cannot.
//
// D1/T4.5 — providers that can fetch external URLs (Anthropic, OpenAI) get
// short-lived signed URLs instead of inline base64: request bodies stay far
// below provider caps and Worker memory never holds the bytes. Gemini only
// accepts inline media, so it stays on base64 under its own tighter budget.

import type { ChatProxyRequest, ProviderId } from '@nova/shared'
import { loadAttachment, loadAttachmentRow, signAttachmentUrl, type FilesEnv } from './files'
import { toBase64, type ResolvedPart, type ResolvedTurn } from '@nova/ai'

/** per-request ceiling for INLINE base64 bytes (raw, pre-encoding). Gemini's
 *  whole-request cap is 20MB, so its raw budget must stay ≤ 14MB
 *  (14 × 4/3 ≈ 18.7MB encoded); everyone else fits comfortably in 18MB. */
const INLINE_BUDGET: Partial<Record<ProviderId, number>> = { gemini: 14 * 1024 * 1024 }
const DEFAULT_INLINE_BUDGET = 18 * 1024 * 1024

/** providers whose wire format accepts external URLs for binary parts */
const URL_CAPABLE: ReadonlySet<ProviderId> = new Set(['claude', 'openai'])

/** text files are excerpted — enough for real documents, never unbounded */
const TEXT_CAP = 30_000

const note = (name: string) => `[attached: ${name} — content unavailable]`

const fence = (name: string, text: string) =>
  `[file: ${name}]\n\`\`\`\n${text.slice(0, TEXT_CAP)}\n\`\`\``

export interface ResolveOpts {
  /** routes URL-capable providers onto signed URLs */
  providerId?: ProviderId
  /** public https origin the provider can reach — absent (or plain http,
   *  e.g. local wrangler) forces the base64 fallback */
  publicOrigin?: string
}

/**
 * Resolve every turn's attachment refs. Newest turns resolve FIRST so the
 * inline budget always favours what the user just sent; refs that miss the
 * budget (or are missing/foreign) degrade into a text note instead of
 * failing the whole chat.
 */
export async function resolveAttachments(
  env: FilesEnv,
  userId: string,
  messages: ChatProxyRequest['messages'],
  opts: ResolveOpts = {},
): Promise<ResolvedTurn[]> {
  const out: ResolvedTurn[] = messages.map((m) => ({ role: m.role, content: m.content }))
  const byUrl =
    !!opts.providerId &&
    URL_CAPABLE.has(opts.providerId) &&
    !!opts.publicOrigin?.startsWith('https://')
  let budget = (opts.providerId && INLINE_BUDGET[opts.providerId]) ?? DEFAULT_INLINE_BUDGET

  for (let i = messages.length - 1; i >= 0; i--) {
    const refs = messages[i].attachments
    if (!refs?.length) continue
    const extraText: string[] = []
    const parts: ResolvedPart[] = []
    for (const ref of refs.slice(0, 4)) {
      if (byUrl) {
        // URL mode: bytes never enter the Worker — sign a fetchable link
        const row = await loadAttachmentRow(env, userId, ref.id)
        if (!row) {
          extraText.push(note(String(ref.id)))
          continue
        }
        if (row.kind === 'image' || row.kind === 'pdf') {
          const url = await signAttachmentUrl(env, row.id, opts.publicOrigin!)
          parts.push(
            row.kind === 'image'
              ? { type: 'image', name: row.name, mime: row.mime, url }
              : { type: 'pdf', name: row.name, url },
          )
        } else {
          const found = await loadAttachment(env, userId, ref.id)
          if (found) extraText.push(fence(row.name, new TextDecoder().decode(found.bytes)))
          else extraText.push(note(row.name))
        }
        continue
      }
      const found = await loadAttachment(env, userId, ref.id)
      if (!found) {
        extraText.push(note(String(ref.id)))
        continue
      }
      const { row, bytes } = found
      if (row.kind === 'image' || row.kind === 'pdf') {
        if (bytes.byteLength > budget) {
          extraText.push(note(row.name))
          continue
        }
        budget -= bytes.byteLength
        parts.push(
          row.kind === 'image'
            ? { type: 'image', name: row.name, mime: row.mime, base64: toBase64(bytes) }
            : { type: 'pdf', name: row.name, base64: toBase64(bytes) },
        )
      } else {
        // code/csv/md — text rides inside the turn itself
        extraText.push(fence(row.name, new TextDecoder().decode(bytes)))
      }
    }
    if (parts.length) out[i].parts = parts
    if (extraText.length)
      out[i].content = [extraText.join('\n\n'), out[i].content].filter(Boolean).join('\n\n')
  }
  return out
}
