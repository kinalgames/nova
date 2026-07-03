// Sync transport (BE2): push/pull record-level ops against the per-user
// Durable Object through nova-api. Requires a session (bearer token).

import type { SyncOp, SyncPullResponse, SyncWsFrame } from '@nova/shared'
import { API_BASE } from './llm'
import { getToken } from './auth'

/** per-tab id — rides every push as `src` so this tab can skip its own echo
 *  when the DO fans the batch back out over the live socket */
export const SYNC_SRC = Math.random().toString(36).slice(2, 10)

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
      body: JSON.stringify({ ops, src: SYNC_SRC }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { seq: number }
    return data.seq
  } catch {
    return null
  }
}

/** B7 — keep one live socket to the user's DO while the tab is visible.
 *  Owns connect/reconnect (exponential backoff + jitter, reset when the tab
 *  returns to the foreground); the caller owns cursor logic via onFrame.
 *  Returns a stop() that closes the socket and cancels every timer. */
export function startLiveSync(o: { onFrame: (f: SyncWsFrame) => void }): () => void {
  // real browsers only: jsdom has no WebSocket, node test env has no document
  if (typeof WebSocket === 'undefined' || typeof document === 'undefined') return () => {}
  let ws: WebSocket | null = null
  let stopped = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const wsUrl = () => `${(API_BASE || location.origin).replace(/^http/, 'ws')}/v1/sync/ws`
  const schedule = () => {
    if (stopped) return
    const delay = Math.min(30_000, 1000 * 2 ** attempt++) + Math.random() * 400
    timer = setTimeout(open, delay)
  }
  const open = () => {
    // background tabs connect too — hibernated sockets are near-free and a
    // hidden tab must be current the moment it returns (a bail here also
    // left ws=null with NOTHING scheduled: the socket never came up)
    if (stopped) return
    const token = getToken()
    if (!token) {
      // not signed in yet — a cheap LOCAL check, so poll it flat every 2s
      // (no backoff: login must connect promptly, and nothing hits the wire)
      timer = setTimeout(open, 2000)
      return
    }
    try {
      // RFC 6455 subprotocol entries allow only token-chars — a raw bearer
      // (may contain '=', '/', '+') makes new WebSocket() THROW synchronously
      // in browsers. base64url ([A-Za-z0-9_-], no padding) is always legal.
      const legal = btoa(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      ws = new WebSocket(wsUrl(), ['nova-sync', legal])
    } catch {
      schedule()
      return
    }
    ws.onopen = () => {
      attempt = 0
    }
    ws.onmessage = (e) => {
      try {
        o.onFrame(JSON.parse(String(e.data)) as SyncWsFrame)
      } catch {
        // junk frame — the cursor gap-check heals on the next real one
      }
    }
    ws.onclose = () => {
      ws = null
      schedule()
    }
    ws.onerror = () => {
      try {
        ws?.close()
      } catch {
        /* already closed */
      }
    }
  }
  const onVis = () => {
    if (document.visibilityState === 'visible' && !ws) {
      attempt = 0
      clearTimeout(timer)
      open()
    }
  }
  document.addEventListener('visibilitychange', onVis)
  open()
  return () => {
    stopped = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVis)
    ws?.close()
  }
}
