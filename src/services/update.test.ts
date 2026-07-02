import { afterEach, describe, expect, it, vi } from 'vitest'
import { installChunkRecovery, newerBuildAvailable } from './update'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response

describe('newerBuildAvailable', () => {
  it('reports an update when the served build differs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ build: 'other' })))
    expect(await newerBuildAvailable('current')).toBe(true)
  })

  it('same build → no update', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ build: 'current' })))
    expect(await newerBuildAvailable('current')).toBe(false)
  })

  it('non-ok response, malformed body, or network failure → no update', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false)))
    expect(await newerBuildAvailable('current')).toBe(false)

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { throw new Error('html') } }) as unknown as Response))
    expect(await newerBuildAvailable('current')).toBe(false)

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await newerBuildAvailable('current')).toBe(false)
  })
})

describe('installChunkRecovery', () => {
  const fire = () => {
    const e = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(e)
    return e
  }

  it('reloads once on a chunk failure, then rate-limits the retry', () => {
    const reload = vi.fn()
    let t = 1_000_000
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }
    const uninstall = installChunkRecovery(reload, () => t, storage)

    const first = fire()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(first.defaultPrevented).toBe(true)

    // a second failure right away must NOT loop
    const second = fire()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)

    // after the window passes, recovery is allowed again (next deploy)
    t += 61_000
    fire()
    expect(reload).toHaveBeenCalledTimes(2)

    uninstall()
    fire()
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
