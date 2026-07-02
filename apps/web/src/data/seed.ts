// Locale-aware demo seed content (i18n phase 2). The showcase conversations,
// sample projects, preview documents and quiet-mode exchange are DATA, not
// chrome copy — so they live as one structured bundle per language instead of
// scattered catalog keys. The language detected at FIRST BOOT decides which
// bundle seeds the persisted store (like real user content, seeds are not
// re-translated afterwards); live-rendered pieces (quiet sample, preview
// metas, document bodies) follow the current language at render time.

import i18n from '../i18n'
import type { Message, PreviewKind, ProjectFile } from '../state/types'
import type { ProfileKind, ProviderId } from './defs'
import { seedVi } from './seed.vi'
import { seedEn } from './seed.en'

export interface SeedProjectDef {
  id: string
  name: string
  description: string
  accent: string
  isDefault?: boolean
}

export interface SeedConvDef {
  id: string
  title: string
  projectId: string
  demo?: boolean
}

export interface SeedProfileDef {
  id: string
  name: string
  kind: ProfileKind
  credential: string
  status: 'active' | 'limited' | 'error' | 'untested'
}

export interface SeedData {
  projects: SeedProjectDef[]
  convs: SeedConvDef[]
  threads: Record<string, Message[]>
  profiles: Record<ProviderId, SeedProfileDef[]>
  /** aurora's seeded reference documents */
  projectFiles: ProjectFile[]
  /** representative bodies for the preview/download of demo documents */
  samples: Record<PreviewKind, { type: string; body: string }>
  /** meta line under a preview title, per kind */
  previewMeta: Record<'pdf' | 'code' | 'csv' | 'md', string>
  /** the quiet-mode sample exchange */
  quiet: { user: string; intro: string; risks: { t: string; d: string }[] }
}

/** the seed bundle for the CURRENT language (vi default) */
export function getSeed(): SeedData {
  return i18n.language?.startsWith('vi') === false ? seedEn : seedVi
}
