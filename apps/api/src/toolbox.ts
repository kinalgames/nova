// D1/T5 — Nova-side tools the agentic loop executes between rounds.
// v1 ships ONE tool: `files` — read-only access to the user's own uploads
// (owner-checked through the same D1/R2 path as attachments). Read-only
// by design: no write op means no write-abuse class.

import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { attachment } from './db/schema'
import { loadAttachment, type FilesEnv } from './files'
import type { NovaTool, ToolCallReq, ToolCallResult } from '@nova/ai'

/** per-request execution budgets — a chat can never drain R2/D1 unbounded */
const MAX_READS = 3
const READ_CAP = 16 * 1024
const MAX_LIST = 50

export interface ToolboxEnv extends FilesEnv {
  DB: D1Database
}

export const filesTool: NovaTool = {
  name: 'files',
  description:
    "Read-only access to files the user uploaded to Nova. op='list' returns one line per file: id · name · kind · size. op='read' with an id returns a text file's content (truncated at 16KB). Images and PDFs cannot be read here — ask the user to attach them to the message instead.",
  parameters: {
    type: 'object',
    properties: {
      op: { type: 'string', enum: ['list', 'read'] },
      id: { type: 'string', description: "file id from op='list'" },
    },
    required: ['op'],
  },
}

/** owner-scoped executor for one chat request (budgets live in the closure) */
export function makeFilesExecutor(env: ToolboxEnv, userId: string) {
  let reads = 0
  return async (call: ToolCallReq): Promise<ToolCallResult> => {
    if (call.name !== 'files')
      return { ok: false, content: `unknown tool: ${call.name}` }
    let args: { op?: unknown; id?: unknown }
    try {
      args = JSON.parse(call.args || '{}') as typeof args
    } catch {
      return { ok: false, content: 'arguments were not valid JSON' }
    }

    if (args.op === 'list') {
      const rows = await drizzle(env.DB)
        .select()
        .from(attachment)
        .where(eq(attachment.userId, userId))
        .limit(MAX_LIST)
      if (!rows.length)
        return { ok: true, content: 'no files uploaded yet', summary: '0 files' }
      return {
        ok: true,
        content: rows.map((r) => `${r.id} · ${r.name} · ${r.kind} · ${r.size}B`).join('\n'),
        summary: `${rows.length} files`,
      }
    }

    if (args.op === 'read') {
      if (typeof args.id !== 'string' || !args.id)
        return { ok: false, content: "op='read' requires an id from op='list'" }
      if (++reads > MAX_READS)
        return { ok: false, content: `read budget exhausted (${MAX_READS} per request)` }
      const found = await loadAttachment(env, userId, args.id)
      if (!found) return { ok: false, content: 'no such file' }
      const { row, bytes } = found
      if (row.kind === 'image' || row.kind === 'pdf')
        return {
          ok: false,
          content: `${row.name} is a ${row.kind} — it cannot be read as text; ask the user to attach it to the message`,
        }
      const text = new TextDecoder().decode(bytes.slice(0, READ_CAP))
      const truncated = bytes.byteLength > READ_CAP
      return {
        ok: true,
        content: truncated ? `${text}\n[truncated at 16KB of ${row.size}B]` : text,
        summary: row.name,
      }
    }

    return { ok: false, content: "op must be 'list' or 'read'" }
  }
}
