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
    badgeBg: 'color-mix(in srgb, var(--info) 12%, transparent)',
    tools: ['bash', 'files', 'fetch'],
  },
  {
    id: 'design',
    glyph: 'design',
    color: 'var(--plum)',
    badgeBg: 'color-mix(in srgb, var(--plum) 12%, transparent)',
    tools: ['fetch', 'files'],
  },
  {
    id: 'research',
    glyph: 'search',
    color: 'var(--success)',
    badgeBg: 'color-mix(in srgb, var(--success) 12%, transparent)',
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
    badgeBg: 'color-mix(in srgb, var(--warn) 14%, transparent)',
    tools: ['bash', 'files'],
  },
]

// provider/model contracts live in the shared domain package (the API uses
// the same shapes); re-exported so existing client imports keep working
import { providerAuth } from '@nova/shared'
import type { ModelDef, ModelRef, ProfileKind, ProviderId, SlotId } from '@nova/shared'
export type { ModelDef, ModelRef, ProfileKind, ProviderId, SlotId } from '@nova/shared'

export interface ProviderDef {
  id: ProviderId
  name: string
  glyph: string
  badgeBg: string
  badgeFg: string
  /** credential kinds this provider supports, in the order the add-menu offers them */
  auth: readonly ProfileKind[]
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
    auth: providerAuth.claude,
    field: 'key',
    placeholder: 'sk-ant-…',
    // curated catalog: latest top models only (legacy joins by user request).
    // Specs per platform.claude.com 2026-07: Opus 4.8 + Sonnet 5 run 1M ctx;
    // Sonnet 5 is on intro pricing ($2/$10) until 2026-08-31, then $3/$15.
    models: [
      // cache pricing = Anthropic's standard formula: write 1.25× in, read 0.1× in
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', mode: 'smart', caps: { reasoning: true, vision: true, toolUse: true, webSearch: true }, ctx: 1_000_000, maxOut: 128_000, inPrice: 5, outPrice: 25, cacheReadPrice: 0.5, cacheWritePrice: 6.25 },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', mode: 'smart', caps: { reasoning: true, vision: true, toolUse: true, webSearch: true }, ctx: 1_000_000, maxOut: 128_000, inPrice: 2, outPrice: 10, cacheReadPrice: 0.2, cacheWritePrice: 2.5 },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', mode: 'fast', caps: { reasoning: true, vision: true, toolUse: true, webSearch: true }, ctx: 200_000, maxOut: 64_000, inPrice: 1, outPrice: 5, cacheReadPrice: 0.1, cacheWritePrice: 1.25 },
    ],
    rec: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    glyph: 'G',
    badgeBg: 'color-mix(in srgb, var(--info) 14%, transparent)',
    badgeFg: 'var(--info)',
    auth: providerAuth.gemini,
    field: 'key',
    placeholder: 'AIza…',
    // Gemini 3 generation (ai.google.dev 2026-07): 3.1 Pro ≤200k-prompt tier
    // $2/$12; 3.5 Flash $1.50/$9 — the 2.5 line is no longer latest-top
    models: [
      // cache-read pricing unverified for the 3.x line — absent by design
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', mode: 'smart', caps: { reasoning: true, vision: true, audio: true, video: true, toolUse: true, webSearch: true }, ctx: 1_048_576, maxOut: 65_536, inPrice: 2, outPrice: 12 },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', mode: 'fast', caps: { reasoning: true, vision: true, audio: true, video: true, toolUse: true, webSearch: true }, ctx: 1_048_576, maxOut: 65_536, inPrice: 1.5, outPrice: 9 },
    ],
    rec: false,
  },
  {
    id: 'openai',
    // product-first naming, consistent with Claude/Gemini: ChatGPT by OpenAI
    name: 'ChatGPT',
    glyph: 'O',
    badgeBg: 'var(--border)',
    badgeFg: 'var(--text)',
    auth: providerAuth.openai,
    field: 'key',
    placeholder: 'sk-…',
    // OpenAI dropped GPT-5/5-mini from the price list (2026-07); the current
    // lineup is GPT-5.5 (flagship $5/$30), 5.4 ($2.50/$15), 5.4-mini
    // ($0.75/$4.50) — all 1M ctx. 5.6 stays preview-gated, not listed.
    models: [
      // cached-input = OpenAI's standard 10% of input; no write charge
      { id: 'gpt-5.5', name: 'GPT-5.5', mode: 'smart', caps: { reasoning: true, vision: true, toolUse: true, webSearch: true }, ctx: 1_000_000, inPrice: 5, outPrice: 30, cacheReadPrice: 0.5 },
      { id: 'gpt-5.4', name: 'GPT-5.4', mode: 'smart', caps: { reasoning: true, vision: true, toolUse: true, webSearch: true }, ctx: 1_000_000, inPrice: 2.5, outPrice: 15, cacheReadPrice: 0.25 },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', mode: 'fast', caps: { reasoning: true, vision: true, toolUse: true, webSearch: true }, ctx: 1_000_000, inPrice: 0.75, outPrice: 4.5, cacheReadPrice: 0.075 },
    ],
    rec: false,
  },
  {
    id: 'ollama',
    // display name is localized at consumption (vocab.providers.ollama.name)
    name: 'Ollama',
    glyph: '◍',
    badgeBg: 'var(--success-bg)',
    badgeFg: 'var(--success)',
    auth: providerAuth.ollama,
    field: 'endpoint',
    placeholder: 'http://localhost:11434',
    // ollama's catalog is DYNAMIC — the store hydrates it from the user's
    // endpoint (/api/tags + /api/show, P3); nothing is hardcoded here
    models: [],
    rec: false,
  },
]

/** the two quality slots route chats cross-provider — “Thông minh”/“Nhanh”
 * are routing choices, not provider choices */
export const defaultSlots: Record<SlotId, ModelRef> = {
  smart: { providerId: 'claude', modelId: 'claude-opus-4-8' },
  fast: { providerId: 'claude', modelId: 'claude-haiku-4-5' },
}

export function findProvider(id: ProviderId): ProviderDef {
  // provDefs covers every ProviderId — the fallback guards corrupted persisted refs
  return provDefs.find((p) => p.id === id) ?? provDefs[0]
}

/** stand-in def for a DYNAMIC (ollama) model id — local models cost nothing;
 *  caps stay empty until the endpoint reports them (/api/show). `mode` is a
 *  placeholder: local models list in BOTH slot pickers regardless. */
export function dynamicModel(id: string): ModelDef {
  return { id, name: id, mode: 'fast', caps: {}, ctx: 0, inPrice: 0, outPrice: 0 }
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
  const found = prov.models.find((m) => m.id === ref.modelId)
  if (found) return found
  // ollama's catalog is dynamic — any persisted/routed id resolves to a
  // synthesized def instead of being healed away
  if (ref.providerId === 'ollama') return dynamicModel(ref.modelId)
  return prov.models[0]
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
  { id: 'plan', glyph: 'plan', bg: 'color-mix(in srgb, var(--info) 12%, transparent)', fg: 'var(--info)' },
  { id: 'learn', glyph: 'search', bg: 'color-mix(in srgb, var(--success) 12%, transparent)', fg: 'var(--success)' },
  { id: 'docs', glyph: 'file', bg: 'color-mix(in srgb, var(--plum) 12%, transparent)', fg: 'var(--plum)' },
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
