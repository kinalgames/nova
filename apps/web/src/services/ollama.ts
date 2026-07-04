// B6c — dynamic ollama catalog: list the endpoint's installed models (real
// capabilities) and pull new ones with progress, both through the nova-api
// proxy. The credential source mirrors chat: a sealed server credential id,
// or the transitional inline endpoint.

import type { ModelDef } from '@nova/shared'
import type { AuthProfile } from '../state/types'
import { API_BASE } from './llm'
import { getToken } from './token'

export interface OllamaModelRow extends ModelDef {
  size: string
}

/** exactly-one credential source for an ollama profile */
const sourceOf = (p: AuthProfile) =>
  p.server ? { credentialId: p.id } : { endpoint: p.credential }

const headers = () => {
  const token = getToken()
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

/** models installed on the profile's endpoint; null = unreachable/refused */
export async function listOllamaModels(profile: AuthProfile): Promise<OllamaModelRow[] | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/ollama/models`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(sourceOf(profile)),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { models?: OllamaModelRow[] }
    return body.models ?? null
  } catch {
    return null
  }
}

export interface PullHandlers {
  /** 0-100 when the layer sizes are known; status text always rides along */
  onProgress: (pct: number | null, status: string) => void
  onDone: () => void
  onError: (message: string) => void
}

/** pull `model` onto the endpoint; progress streams in as SSE frames */
export async function pullOllamaModel(
  profile: AuthProfile,
  model: string,
  h: PullHandlers,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/v1/ollama/pull`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ...sourceOf(profile), model }),
    })
  } catch {
    h.onError('network')
    return
  }
  const reader = res.body?.getReader()
  if (!res.ok || !reader) {
    h.onError(`pull failed (${res.status})`)
    return
  }
  const dec = new TextDecoder()
  let buf = ''
  let failed = false
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, i)
      buf = buf.slice(i + 2)
      if (!frame.startsWith('data: ')) continue
      let p: { status?: string; total?: number; completed?: number; error?: string; done?: boolean }
      try {
        p = JSON.parse(frame.slice(6))
      } catch {
        continue
      }
      if (p.error) {
        failed = true
        h.onError(p.error)
        return
      }
      if (p.done) {
        h.onDone()
        return
      }
      const pct =
        typeof p.total === 'number' && p.total > 0 && typeof p.completed === 'number'
          ? Math.min(100, Math.round((p.completed / p.total) * 100))
          : null
      h.onProgress(pct, p.status ?? '')
    }
  }
  if (!failed) h.onDone()
}
