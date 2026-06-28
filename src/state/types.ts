import type { PresetId, ProviderId, ProviderStatus } from '../data/defs'

export type LiveProviderStatus = ProviderStatus | 'testing' | 'error'

export type ViewName =
  | 'home'
  | 'conversation'
  | 'projects'
  | 'projectcfg'
  | 'assistant'
  | 'settings'

export type RespState = 'done' | 'stream' | 'error' | 'approval'
export type ThinkLevel = 'off' | 'low' | 'normal' | 'high'
export type Theme = 'light' | 'dark' | 'auto'
export type AuthView = null | 'login' | 'signup' | 'onboarding'
export type ModelId = 'opus' | 'haiku'

export type PreviewKind = 'image' | 'pdf' | 'code' | 'csv' | 'md'

export interface Preview {
  kind: PreviewKind
  name: string
  /** Object URL for a real uploaded image (optional). */
  url?: string
}

export interface StagedFile {
  id: string
  kind: PreviewKind
  name: string
  size: string
  /** Object URL for real uploaded images. */
  url?: string
  /** Demo placeholder (gradient image / pdf chip) when no real file. */
  demo?: boolean
}

export interface SentMsg {
  who: string
  color: string
  text: string
  isNova: boolean
}

export interface Conversation {
  id: string
  title: string
  /** the seeded showcase conversation that renders the scripted tool-trace */
  demo?: boolean
}

export interface StyleFlags {
  concise: boolean
  warm: boolean
  formal: boolean
  humor: boolean
}

export interface ToolFlags {
  web: boolean
  fetch: boolean
  files: boolean
  bash: boolean
}

export interface NovaState {
  view: ViewName
  advanced: boolean
  palette: boolean
  inspector: boolean
  quiet: boolean
  traceOpen: boolean
  drawerOpen: boolean
  sidebarCollapsed: boolean
  authView: AuthView
  preview: Preview | null
  respState: RespState
  conversations: Conversation[]
  activeConv: string
  threads: Record<string, SentMsg[]>
  chatProject: 'Aurora' | 'Chung'
  thinkingLevel: ThinkLevel
  theme: Theme
  focusDur: '15' | '25' | '50'
  styles: StyleFlags
  model: ModelId
  tools: ToolFlags
  draft: string
  q: string
  typing: boolean
  typingLabel: string
  barOn: boolean
  copied: boolean
  tokenPct: string
  activeProvider: ProviderId
  providerKeys: Record<ProviderId, string>
  providerStatus: Record<ProviderId, LiveProviderStatus>
  projPresets: Record<PresetId, boolean>
  presetDefault: Record<PresetId, boolean>
  /** staged attachments, keyed by conversation id (per-conversation tray) */
  staged: Record<string, StagedFile[]>
  accent: string
  showShortcutsBar: boolean
  vw: number
}
