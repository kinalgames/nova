import { describe, expect, it } from 'vitest'
import { pickProfile } from './rotation'
import type { AuthProfile } from './contracts'

const pf = (id: string, status: AuthProfile['status'], limitedUntil?: number): AuthProfile => ({
  id,
  name: id,
  kind: 'api_key',
  credential: 'sk-test-0000',
  status,
  limitedUntil,
})

const NOW = 1_000_000

describe('pickProfile — ordered priority + sticky fallback', () => {
  it('returns null for a provider with no profiles', () => {
    expect(pickProfile([], undefined, true, NOW)).toBeNull()
  })

  it('picks the first profile in priority order when nothing is sticky', () => {
    const list = [pf('a', 'active'), pf('b', 'active')]
    expect(pickProfile(list, undefined, true, NOW)?.id).toBe('a')
  })

  it('keeps the sticky profile while it stays usable, even when not first', () => {
    const list = [pf('a', 'active'), pf('b', 'active')]
    expect(pickProfile(list, 'b', true, NOW)?.id).toBe('b')
  })

  it('falls back in priority order when the sticky profile hits a limit', () => {
    const list = [pf('a', 'limited', NOW + 60_000), pf('b', 'active'), pf('c', 'active')]
    expect(pickProfile(list, 'a', true, NOW)?.id).toBe('b')
  })

  it('treats an expired limited window as usable again', () => {
    const list = [pf('a', 'limited', NOW - 1), pf('b', 'active')]
    expect(pickProfile(list, 'a', true, NOW)?.id).toBe('a')
  })

  it('a limited profile without a window stays unusable', () => {
    const list = [pf('a', 'limited'), pf('b', 'active')]
    expect(pickProfile(list, 'a', true, NOW)?.id).toBe('b')
  })

  it('skips errored and untested profiles when rotating', () => {
    const list = [pf('a', 'error'), pf('b', 'untested'), pf('c', 'active')]
    expect(pickProfile(list, 'a', true, NOW)?.id).toBe('c')
  })

  it('returns the sticky profile as a last resort when nothing is usable', () => {
    const list = [pf('a', 'error'), pf('b', 'error')]
    expect(pickProfile(list, 'a', true, NOW)?.id).toBe('a')
  })

  it('autoRotate off: never skips, even when the pinned profile is limited', () => {
    const list = [pf('a', 'limited', NOW + 60_000), pf('b', 'active')]
    expect(pickProfile(list, 'a', false, NOW)?.id).toBe('a')
    expect(pickProfile(list, undefined, false, NOW)?.id).toBe('a')
  })
})
