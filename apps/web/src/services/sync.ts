// Sync transport (BE2): push/pull record-level ops against the per-user
// Durable Object through nova-api. Requires a session (bearer token).

import type { SyncOp, SyncPullResponse } from '@nova/shared'
import { API_BASE } from './llm'
import { getToken } from './auth'

function headers(): Record<string, string> {
  const token = getToken()
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

export async function pullOps(since: number): Promise<SyncPullResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/sync?since=${since}`, {
      headers: headers(),
      credentials: 'include',
    })
    if (!res.ok) return null
    return (await res.json()) as SyncPullResponse
  } catch {
    return null
  }
}

export async function pushOps(ops: SyncOp[]): Promise<number | null> {
  if (ops.length === 0) return null
  try {
    const res = await fetch(`${API_BASE}/v1/sync`, {
      method: 'POST',
      headers: headers(),
      credentials: 'include',
      body: JSON.stringify({ ops }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { seq: number }
    return data.seq
  } catch {
    return null
  }
}
