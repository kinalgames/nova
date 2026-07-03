// BE4 — unlisted share links: create/revoke need the session; reading a
// share is public (the id in the URL is the whole credential).

import { API_BASE } from './llm'
import { getToken } from './token'

export interface ShareMsg {
  role: 'user' | 'assistant'
  who: string
  text: string
  files?: { fileId?: string; name: string; kind: string }[]
}

export interface ShareDoc {
  title: string
  createdAt: string
  messages: ShareMsg[]
}

const authHeaders = (): Record<string, string> => {
  const t = getToken()
  return t ? { authorization: `Bearer ${t}` } : {}
}

/** create a frozen snapshot; resolves the share id or null (fail-soft) */
export async function createShare(
  convId: string,
  title: string,
  messages: ShareMsg[],
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/shares`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ convId, title, messages }),
    })
    if (!res.ok) return null
    return ((await res.json()) as { id?: string }).id ?? null
  } catch {
    return null
  }
}

export async function revokeShare(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v1/shares/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

/** PUBLIC read — no session required */
export async function fetchShare(id: string): Promise<ShareDoc | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/shares/${id}`)
    if (!res.ok) return null
    return (await res.json()) as ShareDoc
  } catch {
    return null
  }
}

/** public URL of a shared attachment — served by the share route itself */
export const shareFileUrl = (shareId: string, fileId: string): string =>
  `${API_BASE}/v1/shares/${shareId}/files/${fileId}`
