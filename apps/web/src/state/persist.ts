// Persisted-settings storage with STEPWISE MIGRATIONS: when the schema
// changes, old data is upgraded version-by-version instead of discarded.

import i18n from '../i18n'
import type { ModelRef, PresetId, ProviderId, SlotId } from '../data/defs'
import type { NovaState, Theme, ThinkLevel } from './types'

export const PERSIST_PREFIX = 'nova.flow.settings'
export const PERSIST_VERSION = 5
export const PERSIST_KEY = `${PERSIST_PREFIX}.v${PERSIST_VERSION}`
/** oldest version a migration chain can start from */
const OLDEST_MIGRATABLE = 4

export interface Persisted {
  theme?: Theme
  advanced?: boolean
  accent?: string
  userName?: string
  userEmail?: string
  accountId?: string
  assistantName?: string
  focusDur?: '15' | '25' | '50'
  barOn?: boolean
  thinkingLevel?: ThinkLevel
  activeSlot?: SlotId
  slots?: Record<SlotId, ModelRef>
  profiles?: NovaState['profiles']
  autoRotate?: boolean
  stickyProfile?: NovaState['stickyProfile']
  tools?: NovaState['tools']
  styles?: NovaState['styles']
  systemPrompt?: string
  projects?: NovaState['projects']
  presetDefault?: Record<PresetId, boolean>
  conversations?: NovaState['conversations']
  activeConv?: string
  threads?: NovaState['threads']
}

/** v4 carried a single model id plus per-provider key/status maps */
interface PersistedV4 extends Omit<
  Persisted,
  'activeSlot' | 'slots' | 'profiles' | 'autoRotate' | 'stickyProfile'
> {
  model?: 'opus' | 'haiku'
  activeProvider?: string
  providerKeys?: Partial<Record<ProviderId, string>>
  providerStatus?: Partial<Record<ProviderId, string>>
}

const PROVIDER_IDS: ProviderId[] = ['claude', 'gemini', 'openai', 'ollama']

/** v4 → v5: model becomes the active slot; each connected provider key
 * becomes one api_key auth profile so the user keeps their credentials */
function migrateV4toV5(old: PersistedV4): Persisted {
  const { model, activeProvider, providerKeys, providerStatus, ...rest } = old
  void activeProvider // dropped — v5 derives the provider from the slot in use
  const profiles: NovaState['profiles'] = { claude: [], gemini: [], openai: [], ollama: [] }
  for (const pid of PROVIDER_IDS) {
    const key = providerKeys?.[pid]
    const status = providerStatus?.[pid]
    if (key && (status === 'connected' || status === 'local'))
      profiles[pid] = [
        {
          id: `mig-${pid}`,
          name: i18n.t('settings.migratedProfile'),
          kind: 'api_key',
          credential: key,
          status: 'active',
        },
      ]
  }
  return {
    ...rest,
    ...(model ? { activeSlot: model === 'haiku' ? 'fast' : 'smart' } : {}),
    ...(providerKeys ? { profiles } : {}),
  }
}

// each entry upgrades exactly one version step; chains compose them
const MIGRATIONS: Record<number, (old: never) => unknown> = {
  4: migrateV4toV5 as (old: never) => unknown,
}

/**
 * Load persisted settings for a namespace key. Prefers the current version's
 * key; for the real namespace it also walks older keys (newest first),
 * upgrades the data through every migration step, saves it under the current
 * key and removes the old one.
 */

/** the conversation the app should reopen, straight from a persisted slice */
export function lastOpenConvId(key: string): string | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const p = JSON.parse(raw) as { conversations?: { id: string }[]; activeConv?: string }
    const known = p.conversations
    if (p.activeConv && (!known || known.some((c) => c.id === p.activeConv))) return p.activeConv
    if (known && known[0]) return known[0].id
    return null
  } catch {
    return null
  }
}
export function loadPersisted(key: string = PERSIST_KEY): Persisted {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as Persisted
    // legacy versioned keys only ever existed for the real namespace
    if (key !== PERSIST_KEY) return {}
    for (let v = PERSIST_VERSION - 1; v >= OLDEST_MIGRATABLE; v--) {
      const oldKey = `${PERSIST_PREFIX}.v${v}`
      const oldRaw = localStorage.getItem(oldKey)
      if (!oldRaw) continue
      let data: unknown = JSON.parse(oldRaw)
      for (let step = v; step < PERSIST_VERSION; step++) {
        const migrate = MIGRATIONS[step]
        if (!migrate) return {} // gap in the chain — treat as a fresh install
        data = migrate(data as never)
      }
      const upgraded = data as Persisted
      localStorage.setItem(PERSIST_KEY, JSON.stringify(upgraded))
      localStorage.removeItem(oldKey)
      return upgraded
    }
    return {}
  } catch {
    return {}
  }
}
