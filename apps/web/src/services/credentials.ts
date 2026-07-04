// BE3 client — server-side sealed BYOK. A credential leaves the browser
// exactly ONCE (the POST that seals it); afterwards the client works with
// {id, hint, status} and chats reference the id.

import type { ProfileKind, ProfileStatus, ProviderId } from '@nova/shared'
import { API_BASE } from './llm'
import { getToken } from './auth'

export interface ServerCredential {
  id: string
  providerId: ProviderId
  kind: ProfileKind
  name: string
  /** display-safe tail (…abcd) — never the secret */
  hint: string
  status: ProfileStatus
  priority: number
}

const headers = (json = false): Record<string, string> => {
  const token = getToken()
  return {
    ...(json ? { 'content-type': 'application/json' } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

export async function listCredentials(): Promise<ServerCredential[] | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/credentials`, {
      headers: headers(),
      credentials: 'include',
    })
    if (!res.ok) return null
    return ((await res.json()) as { credentials: ServerCredential[] }).credentials
  } catch {
    return null
  }
}

export async function addCredential(
  providerId: ProviderId,
  kind: ProfileKind,
  name: string,
  credential: string,
): Promise<ServerCredential | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/credentials`, {
      method: 'POST',
      headers: headers(true),
      credentials: 'include',
      body: JSON.stringify({ providerId, kind, name, credential }),
    })
    if (!res.ok) return null
    return ((await res.json()) as { credential: ServerCredential }).credential
  } catch {
    return null
  }
}

export async function patchCredential(
  id: string,
  patch: { name?: string; status?: ProfileStatus; priority?: number },
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v1/credentials/${id}`, {
      method: 'PATCH',
      headers: headers(true),
      credentials: 'include',
      body: JSON.stringify(patch),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteCredential(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v1/credentials/${id}`, {
      method: 'DELETE',
      headers: headers(),
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export interface PingResult {
  status: 'active' | 'error' | 'limited'
  /** WHY it failed — the server's RFC7807 detail, so “Thất bại” is never mute */
  detail?: string
}

/** REAL credential probe — a 1-token chat through the stored id */
export async function pingCredential(
  id: string,
  providerId: ProviderId,
  model: string,
): Promise<PingResult> {
  try {
    const res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: headers(true),
      credentials: 'include',
      body: JSON.stringify({
        providerId,
        model,
        maxTokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
        credentialId: id,
      }),
    })
    if (res.ok) {
      void res.body?.cancel()
      return { status: 'active' }
    }
    const body = (await res.json().catch(() => ({}))) as { code?: string; detail?: string }
    const detail = (body.detail ?? body.code ?? `HTTP ${res.status}`).slice(0, 280)
    return { status: res.status === 429 ? 'limited' : 'error', detail }
  } catch {
    return { status: 'error', detail: 'network' }
  }
}
