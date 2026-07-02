// T8 client — the server-side month usage roll-up (Analytics Engine).
// Null on any failure: an unconfigured deployment (501), no session, or a
// network error — callers fall back to the local roll-up.

import type { UsageRow } from '@nova/shared'
import { API_BASE } from './llm'
import { getToken } from './auth'

export async function fetchMonthUsage(): Promise<UsageRow[] | null> {
  try {
    const token = getToken()
    const res = await fetch(`${API_BASE}/v1/usage`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    if (!res.ok) return null
    return ((await res.json()) as { rows: UsageRow[] }).rows
  } catch {
    return null
  }
}
