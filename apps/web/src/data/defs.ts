// Static definitions ported verbatim from the Nova Flow prototype logic.
// Locale-dependent seed CONTENT lives in seed.vi.ts / seed.en.ts (via seed.ts).

import type { IconName } from '../components/Icon'

export type PresetId = 'code' | 'design' | 'research' | 'writing' | 'data'

export type ToolChipId = 'bash' | 'files' | 'fetch' | 'web'

export interface PresetDef {
  id: PresetId
  glyph: IconName
  color: string
  badgeBg: string
  /** tool chips shown on the card — translated via vocab.toolChips.* */
  tools: ToolChipId[]
}

export const presetDefs: PresetDef[] = [
  {
    id: 'code',
    glyph: 'command',
    color: 'var(--info)',
    badgeBg: 'rgba(59,91,169,.12)',
    tools: ['bash', 'files', 'fetch'],
  },
  {
    id: 'design',
    glyph: 'design',
    color: 'var(--plum)',
    badgeBg: 'rgba(154,91,138,.12)',
    tools: ['fetch', 'files'],
  },
  {
    id: 'research',
    glyph: 'search',
    color: 'var(--success)',
    badgeBg: 'rgba(62,138,94,.12)',
    tools: ['web', 'fetch'],
  },
  {
    id: 'writing',
    glyph: 'write',
    color: 'var(--accent)',
    badgeBg: 'var(--accent-soft)',
    tools: [],
  },
  {
    id: 'data',
    glyph: 'data',
    color: 'var(--warn)',
    badgeBg: 'rgba(181,133,63,.14)',
    tools: ['bash', 'files'],
  },
]

// provider/model contracts live in the shared domain package (the API uses
// the same shapes); re-exported so existing client imports keep working
import type { ModelDef, ModelRef, ProfileKind, ProviderId, SlotId } from '@nova/shared'
export type { ModelDef, ModelRef, ProfileKind, ProviderId, SlotId } from '@nova/shared'

export interface ProviderDef {
  id: ProviderId
  name: string
  glyph: string
  badgeBg: string
  badgeFg: string
  /** credential kinds this provider supports, in the order the add-menu offers them */
  auth: ProfileKind[]
  /** what an api_key-kind credential means for this provider */
  field: 'key' | 'endpoint'
  /** placeholder for the credential input — translated at consumption when needed */
  placeholder: string
  models: ModelDef[]
  rec: boolean
}

export const provDefs: ProviderDef[] = [
  {
    id: 'claude',
    name: 'Claude',
    glyph: 'C',
    badgeBg: 'var(--accent-soft)',
    badgeFg: 'var(--accent)',
    auth: ['account', 'api_key'],
    field: 'key',
    placeholder: 'sk-ant-…',
    models: [
      { id: 'claude-opus-4', name: 'Claude Opus 4', inPrice: 15, outPrice: 75, pace: 32 },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', inPrice: 3, outPrice: 15, pace: 24 },
      { id: 'claude-haiku-4', name: 'Claude Haiku 4', inPrice: 0.8, outPrice: 4, pace: 16 },
    ],
    rec: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    glyph: 'G',
    badgeBg: 'rgba(59,91,169,.14)',
    badgeFg: 'var(--info)',
    auth: ['account', 'api_key'],
    field: 'key',
    placeholder: 'AIza…',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', inPrice: 1.25, outPrice: 10, pace: 28 },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', inPrice: 0.15, outPrice: 0.6, pace: 14 },
    ],
    rec: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    glyph: 'O',
    badgeBg: 'var(--border)',
    badgeFg: 'var(--text)',
    auth: ['api_key'],
    field: 'key',
    placeholder: 'sk-…',
    models: [
      { id: 'gpt-5', name: 'GPT-5', inPrice: 1.25, outPrice: 10, pace: 26 },
      { id: 'gpt-5-mini', name: 'GPT-5 mini', inPrice: 0.25, outPrice: 2, pace: 15 },
      { id: 'o4', name: 'o4', inPrice: 2, outPrice: 8, pace: 30 },
    ],
    rec: false,
  },
  {
    id: 'ollama',
    name: 'Trên máy của bạn',
    glyph: '◍',
    badgeBg: 'var(--success-bg)',
    badgeFg: 'var(--success)',
    auth: ['api_key'],
    field: 'endpoint',
    placeholder: 'http://localhost:11434',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', inPrice: 0, outPrice: 0, pace: 20 },
      { id: 'qwen2.5', name: 'Qwen 2.5', inPrice: 0, outPrice: 0, pace: 20 },
      { id: 'mistral-nemo', name: 'Mistral Nemo', inPrice: 0, outPrice: 0, pace: 20 },
    ],
    rec: false,
  },
]

/** the two quality slots route chats cross-provider — “Thông minh”/“Nhanh”
 * are routing choices, not provider choices */
export const defaultSlots: Record<SlotId, ModelRef> = {
  smart: { providerId: 'claude', modelId: 'claude-opus-4' },
  fast: { providerId: 'claude', modelId: 'claude-haiku-4' },
}

export function findProvider(id: ProviderId): ProviderDef {
  // provDefs covers every ProviderId — the fallback guards corrupted persisted refs
  return provDefs.find((p) => p.id === id) ?? provDefs[0]
}

/** look a model up by its globally-unique id (usage records store only the id) */
export function findModelById(modelId: string): ModelDef | undefined {
  for (const p of provDefs) {
    const m = p.models.find((x) => x.id === modelId)
    if (m) return m
  }
  return undefined
}

export function findModel(ref: ModelRef): ModelDef {
  const prov = findProvider(ref.providerId)
  return prov.models.find((m) => m.id === ref.modelId) ?? prov.models[0]
}

// chip colours per profile status — badge text translated at consumption (vocab.profileStatus.*)
export const profileStatusMap: Record<
  'active' | 'limited' | 'error' | 'untested',
  { fg: string; bg: string }
> = {
  active: { fg: 'var(--success-text)', bg: 'var(--success-bg)' },
  limited: { fg: 'var(--warn-text)', bg: 'var(--warn-bg)' },
  error: { fg: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  untested: { fg: 'var(--muted)', bg: 'var(--fill)' },
}

export type SuggestionId = 'write' | 'plan' | 'learn' | 'docs'

export interface SuggestionDef {
  id: SuggestionId
  glyph: IconName
  bg: string
  fg: string
}

export const suggestionDefs: SuggestionDef[] = [
  { id: 'write', glyph: 'write', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  { id: 'plan', glyph: 'plan', bg: 'rgba(59,91,169,.12)', fg: 'var(--info)' },
  { id: 'learn', glyph: 'search', bg: 'rgba(62,138,94,.12)', fg: 'var(--success)' },
  { id: 'docs', glyph: 'file', bg: 'rgba(154,91,138,.12)', fg: 'var(--plum)' },
]

/** accent swatches offered when creating/recolouring a project */
export const projectAccents = [
  'var(--accent)',
  'var(--info)',
  'var(--success)',
  'var(--plum)',
  'var(--warn)',
  'var(--faint)',
]
