// Zero-downtime client helpers: detect a newer deploy (E1) and recover from
// stale-chunk load failures right after a deploy (E2).

/** the build id baked in at build time; 'dev' when served by the dev server */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'undefined' ? 'dev' : __BUILD_ID__

/**
 * True when the server's /version.json names a different build than the one
 * this client was built from. Any failure (dev server, offline, HTML fallback
 * from the SPA rewrite) counts as "no update" — the check must never break
 * the app it is protecting.
 */
export async function newerBuildAvailable(current: string = BUILD_ID): Promise<boolean> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as { build?: string }
    return typeof data.build === 'string' && data.build !== current
  } catch {
    return false
  }
}

/** how often the client re-checks /version.json */
export const UPDATE_POLL_MS = 60_000

/**
 * Reload once when a lazy chunk fails to load (old hashed files vanish after
 * a deploy). Rate-limited via sessionStorage so a chunk that is genuinely
 * gone cannot cause a reload loop. Vite fires 'vite:preloadError' for failed
 * dynamic imports; preventDefault() suppresses the rethrow we are handling.
 */
export function installChunkRecovery(
  reload: () => void = () => window.location.reload(),
  now: () => number = Date.now,
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.sessionStorage,
  minIntervalMs = 60_000,
): () => void {
  const KEY = 'nova.chunk.reloadedAt'
  const onPreloadError = (e: Event) => {
    const last = Number(storage.getItem(KEY) ?? 0)
    if (now() - last < minIntervalMs) return // already tried — surface the error
    e.preventDefault()
    storage.setItem(KEY, String(now()))
    reload()
  }
  window.addEventListener('vite:preloadError', onPreloadError)
  return () => window.removeEventListener('vite:preloadError', onPreloadError)
}
