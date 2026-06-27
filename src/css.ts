import type { CSSProperties } from 'react'

const cache = new Map<string, CSSProperties>()

/**
 * Convert a CSS declaration string ("a:b;c:d") into a React style object.
 * Lets us paste the prototype's inline styles verbatim for a faithful port.
 */
export function css(decl: string): CSSProperties {
  const hit = cache.get(decl)
  if (hit) return hit
  const out: Record<string, string> = {}
  for (const part of decl.split(';')) {
    const seg = part.trim()
    if (!seg) continue
    const i = seg.indexOf(':')
    if (i === -1) continue
    const rawProp = seg.slice(0, i).trim()
    const value = seg.slice(i + 1).trim()
    if (!rawProp) continue
    const prop = rawProp.startsWith('--')
      ? rawProp
      : rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    out[prop] = value
  }
  const frozen = out as CSSProperties
  cache.set(decl, frozen)
  return frozen
}
