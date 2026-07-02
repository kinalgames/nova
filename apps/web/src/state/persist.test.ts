import { beforeEach, describe, expect, it } from 'vitest'
import { loadPersisted, PERSIST_KEY, PERSIST_PREFIX } from './persist'

beforeEach(() => localStorage.clear())

const V4_KEY = `${PERSIST_PREFIX}.v4`

describe('persist — stepwise migrations', () => {
  it('returns current-version data untouched', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ theme: 'dark', activeSlot: 'fast' }))
    expect(loadPersisted()).toEqual({ theme: 'dark', activeSlot: 'fast' })
  })

  it('upgrades v4: model → activeSlot, connected keys → auth profiles', () => {
    localStorage.setItem(
      V4_KEY,
      JSON.stringify({
        theme: 'dark',
        model: 'haiku',
        activeProvider: 'claude',
        providerKeys: { claude: 'sk-ant-legacy', gemini: 'never-tested', ollama: 'http://localhost:11434' },
        providerStatus: { claude: 'connected', gemini: 'add', ollama: 'local' },
      }),
    )
    const p = loadPersisted()
    expect(p.theme).toBe('dark')
    expect(p.activeSlot).toBe('fast')
    // the migrated shape drops v4-only fields entirely
    expect(p).not.toHaveProperty('model')
    expect(p).not.toHaveProperty('activeProvider')
    expect(p).not.toHaveProperty('providerKeys')
    // connected/local providers keep their credential as an api_key profile
    expect(p.profiles?.claude).toEqual([
      { id: 'mig-claude', name: 'Đã di chuyển', kind: 'api_key', credential: 'sk-ant-legacy', status: 'active' },
    ])
    expect(p.profiles?.ollama?.[0].credential).toBe('http://localhost:11434')
    // an unconnected provider migrates to no profiles
    expect(p.profiles?.gemini).toEqual([])
    // the upgrade is written to the current key and the old key is removed
    expect(localStorage.getItem(PERSIST_KEY)).not.toBeNull()
    expect(localStorage.getItem(V4_KEY)).toBeNull()
  })

  it('v4 data without provider fields keeps the seeded defaults downstream', () => {
    localStorage.setItem(V4_KEY, JSON.stringify({ advanced: false }))
    const p = loadPersisted()
    expect(p.advanced).toBe(false)
    // absent in v4 → left undefined so initialState() falls back to seeds
    expect(p.profiles).toBeUndefined()
    expect(p.activeSlot).toBeUndefined()
  })

  it('prefers the current key over an older one', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ theme: 'light' }))
    localStorage.setItem(V4_KEY, JSON.stringify({ theme: 'dark' }))
    expect(loadPersisted().theme).toBe('light')
  })

  it('corrupted JSON degrades to a fresh install', () => {
    localStorage.setItem(PERSIST_KEY, '{not-json')
    expect(loadPersisted()).toEqual({})
  })

  it('nothing stored → fresh install', () => {
    expect(loadPersisted()).toEqual({})
  })
})
