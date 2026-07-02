import type { ModelRef, PresetId, ProfileKind, ProviderId, SlotId } from '../data/defs'
import type { IconName } from '../components/Icon'
import type { Thread } from './thread'

/** lifecycle of an auth profile: usable → rate-limited → broken → not yet verified */
export type ProfileStatus = 'active' | 'limited' | 'error' | 'untested'

/** one credential a provider can be reached through — an OAuth account
 * (「Tài khoản」, cost 0) or an API key/endpoint (「Khóa API」, metered) */
export interface AuthProfile {
  id: string
  /** user-given label */
  name: string
  kind: ProfileKind
  /** masked key, account email, or endpoint URL */
  credential: string
  status: ProfileStatus
  /** epoch ms when a 'limited' profile becomes usable again */
  limitedUntil?: number
}

export type ViewName = 'home' | 'conversation' | 'projects' | 'project' | 'projectcfg'

export type SettingsTab = 'general' | 'providers' | 'assistant'

export type RespState = 'done' | 'stream' | 'error' | 'approval'
export type ThinkLevel = 'off' | 'low' | 'normal' | 'high'
export type Theme = 'light' | 'dark' | 'auto'
export type AuthView = null | 'login' | 'signup' | 'onboarding'
/** token usage recorded on an assistant reply — the future backend writes the
 * real numbers; the fake layer estimates them so the UI stays honest */
export interface MsgUsage {
  inputTokens: number
  outputTokens: number
  modelId: string
  profileId: string
}

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
  /** tree edge — undefined for a root message (managed by state/thread.ts) */
  parentId?: string
  state?: MsgState
  /** approval-card payload, shown when state === 'approval' */
  approval?: { tool: string; command: string }
  /** UI-only reader feedback on an assistant reply */
  feedback?: 'up' | 'down'
  /** token usage + routing of an assistant reply (account profiles cost 0) */
  usage?: MsgUsage
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
  /** epoch ms of the last message activity — drives date grouping; data
   * predating the field groups as "older" until it sees activity */
  updatedAt?: number
  /** hidden from recents, listed in the collapsed LƯU TRỮ section */
  archived?: boolean
}

/** a reference document attached to a project */
export interface ProjectFile {
  id: string
  kind: PreviewKind
  name: string
  /** human-readable size/detail line */
  meta: string
  /** object URL for a real uploaded image */
  url?: string
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
  /** reference documents Nova consults for this project */
  files?: ProjectFile[]
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
  /** conversation id being renamed (paper dialog), or null */
  renamingConv: string | null
  preview: Preview | null
  respState: RespState
  projects: Project[]
  conversations: Conversation[]
  /** conversation ids in their optimistic-delete undo window */
  deleting: string[]
  activeConv: string
  threads: Record<string, Thread>
  /** message id currently being edited inline, or null */
  editingMsg: string | null
  /** message id whose copy action just fired (transient check icon) */
  copiedMsg: string | null
  thinkingLevel: ThinkLevel
  theme: Theme
  focusDur: '15' | '25' | '50'
  styles: StyleFlags
  /** which quality slot new messages route through */
  activeSlot: SlotId
  /** cross-provider model routing per slot */
  slots: Record<SlotId, ModelRef>
  tools: ToolFlags
  draft: string
  q: string
  typing: boolean
  typingLabel: string
  barOn: boolean
  copied: boolean
  tokenPct: string
  /** auth profiles per provider, ordered by rotation priority */
  profiles: Record<ProviderId, AuthProfile[]>
  /** rotate to the next usable profile when one hits a limit */
  autoRotate: boolean
  /** sticky rotation pointer — the profile each provider is currently pinned to */
  stickyProfile: Partial<Record<ProviderId, string>>
  /** profile id with an in-flight connection test (ephemeral, not persisted) */
  testingProfile: string | null
  /** a newer deploy exists — show the update toast (ephemeral) */
  updateReady: boolean
  /** transient notice toast text (share-link copied, …), or null */
  toast: string | null
  /** the archived section in the sidebar is expanded (ephemeral) */
  archivedOpen: boolean
  presetDefault: Record<PresetId, boolean>
  /** staged attachments, keyed by conversation id (per-conversation tray) */
  staged: Record<string, StagedFile[]>
  accent: string
  showShortcutsBar: boolean
  vw: number
}
