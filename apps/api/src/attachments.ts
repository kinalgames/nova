// B1 — turn attachment REFS into provider-ready parts, owner-checked.
// Text/code files fold straight into the turn's text (every model reads
// text); images and PDFs become binary parts each adapter renders in its
// own wire format — or degrades into a bracketed note when it cannot.

import type { ChatProxyRequest } from '@nova/shared'
import { loadAttachment, type FilesEnv } from './files'
import { toBase64, type ResolvedPart, type ResolvedTurn } from '@nova/ai'

/** per-request ceiling for resolved binary bytes — stays under every
 *  provider's request cap once base64 inflates them by ~4/3 */
const BINARY_BUDGET = 18 * 1024 * 1024
/** text files are excerpted — enough for real documents, never unbounded */
const TEXT_CAP = 30_000

const note = (name: string) => `[attached: ${name} — content unavailable]`

const fence = (name: string, text: string) =>
  `[file: ${name}]\n\`\`\`\n${text.slice(0, TEXT_CAP)}\n\`\`\``

/**
 * Resolve every turn's attachment refs. Newest turns resolve FIRST so the
 * binary budget always favours what the user just sent; refs that miss the
 * budget (or are missing/foreign) degrade into a text note instead of
 * failing the whole chat.
 */
export async function resolveAttachments(
  env: FilesEnv,
  userId: string,
  messages: ChatProxyRequest['messages'],
): Promise<ResolvedTurn[]> {
  const out: ResolvedTurn[] = messages.map((m) => ({ role: m.role, content: m.content }))
  let budget = BINARY_BUDGET

  for (let i = messages.length - 1; i >= 0; i--) {
    const refs = messages[i].attachments
    if (!refs?.length) continue
    const extraText: string[] = []
    const parts: ResolvedPart[] = []
    for (const ref of refs.slice(0, 4)) {
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
