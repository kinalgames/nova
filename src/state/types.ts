import type { PresetId, ProviderId, ProviderStatus } from '../data/defs'
import type { IconName } from '../components/Icon'

export type LiveProviderStatus = ProviderStatus | 'testing' | 'error'

export type ViewName = 'home' | 'conversation' | 'projects' | 'project' | 'projectcfg'

export type SettingsTab = 'general' | 'providers' | 'assistant'

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

export type BlockTone = 'danger' | 'success' | 'warn' | 'muted' | 'accent'

/** one step in the collapsible tool-use trace */
export interface TraceStep {
  kind: 'think' | 'tool' | 'note' | 'quote' | 'code' | 'done'
  /** think-step body text */
  text?: string
  /** timeline node style on the rail */
  node?: 'accent' | 'danger' | 'dashed' | 'check'
  /** step title (think text / node label / done label) */
  title?: string
  /** muted detail after the title */
  detail?: string
  /** tool row (advanced view): name + icon + query + result */
  tool?: string
  toolIcon?: IconName
  query?: string
  result?: string
  resultTone?: BlockTone
  /** quoted page excerpt */
  quote?: string
  /** terminal code lines */
  code?: string[]
}

export interface MsgAttachment {
  kind: PreviewKind
  name: string
  meta?: string
  /** render as a gradient image tile rather than a file pill */
  image?: boolean
  /** which preview the chip opens */
  open?: PreviewKind
}

export interface MsgAction {
  icon: IconName
  label: string
  action: 'copy' | 'retry' | PreviewKind
}

/** a renderable content block inside a message */
export type Block =
  | { type: 'text'; text: string; size?: 'body' | 'lead' }
  | { type: 'files'; label?: string; items: MsgAttachment[] }
  | { type: 'trace'; summary: string; meta?: string; steps: TraceStep[] }
  | { type: 'table'; head: string[]; rows: { text: string; tone?: BlockTone }[][] }
  | { type: 'sources'; items: { n: number; label: string; open: PreviewKind }[] }
  | { type: 'actions'; items: MsgAction[] }

/** assistant in-flight states (the demo switcher maps to the last message) */
export type MsgState = 'streaming' | 'error' | 'approval'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  /** display label, e.g. MINH / NOVA */
  who: string
  state?: MsgState
  /** approval-card payload, shown when state === 'approval' */
  approval?: { tool: string; command: string }
  blocks: Block[]
}

export interface Conversation {
  id: string
  title: string
  /** the project this conversation belongs to (default 'chung') */
  projectId: string
  /** the seeded showcase conversation that renders the scripted tool-trace */
  demo?: boolean
  /** user-pinned to the top of the recent list */
  pinned?: boolean
}

export interface Project {
  id: string
  name: string
  description: string
  /** accent dot colour token */
  accent: string
  /** the catch-all project ('chung') — cannot be renamed or deleted */
  isDefault?: boolean
  /** per-project skill presets */
  presets: Record<PresetId, boolean>
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
  advanced: boolean
  palette: boolean
  quiet: boolean
  traceOpen: boolean
  drawerOpen: boolean
  sidebarCollapsed: boolean
  preview: Preview | null
  respState: RespState
  projects: Project[]
  conversations: Conversation[]
  /** conversation ids in their optimistic-delete undo window */
  deleting: string[]
  activeConv: string
  threads: Record<string, Message[]>
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
  presetDefault: Record<PresetId, boolean>
  /** staged attachments, keyed by conversation id (per-conversation tray) */
  staged: Record<string, StagedFile[]>
  accent: string
  showShortcutsBar: boolean
  vw: number
}
