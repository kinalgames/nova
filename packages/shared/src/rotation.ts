import type { AuthProfile } from './contracts'

/**
 * Pick the auth profile a request routes through.
 *
 * Approved rotation rules — ordered priority + sticky fallback:
 * - `autoRotate` ON: keep the sticky profile while it stays usable; when it
 *   is not usable, fall back to the FIRST usable profile in priority order.
 *   A 'limited' profile whose window has expired counts as usable again.
 *   The caller persists the returned profile as the new sticky pointer, so a
 *   fallback stays in use (sticky) instead of thrashing back on every send.
 * - `autoRotate` OFF: never skip — the sticky profile (or the top-priority
 *   one) is always used, even when limited or errored.
 * - Empty list → null (provider not connected).
 */
export function pickProfile(
  profiles: AuthProfile[],
  stickyId: string | undefined,
  autoRotate: boolean,
  now = Date.now(),
): AuthProfile | null {
  if (profiles.length === 0) return null
  const usable = (p: AuthProfile) =>
    p.status === 'active' || (p.status === 'limited' && (p.limitedUntil ?? Infinity) <= now)
  const sticky = profiles.find((p) => p.id === stickyId)
  if (!autoRotate) return sticky ?? profiles[0]
  if (sticky && usable(sticky)) return sticky
  return profiles.find(usable) ?? sticky ?? profiles[0]
}
