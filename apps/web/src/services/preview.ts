// Fetch a real uploaded file's content for the Preview lightbox. Same bearer
// path as the message image tiles (/v1/files/:id), just surfaced as text or a
// blob object URL depending on what the preview needs to render.

import { API_BASE } from './llm'
import { getToken } from './token'

async function fetchFile(fileId: string): Promise<Response> {
  const token = getToken()
  return fetch(`${API_BASE}/v1/files/${fileId}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
}

/** the decoded text of a code/csv/md file, or null on any failure */
export async function fetchFileText(fileId: string): Promise<string | null> {
  try {
    const res = await fetchFile(fileId)
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

/** an object URL for an image/pdf blob (caller revokes it), or null on failure */
export async function fetchFileObjectUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetchFile(fileId)
    if (!res.ok) return null
    return URL.createObjectURL(await res.blob())
  } catch {
    return null
  }
}
