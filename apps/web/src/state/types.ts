import type { AuthProfile, ModelRef, MsgUsage, SlotId } from '@nova/shared'
import type { PresetId, ProviderId } from '../data/defs'
import type { IconName } from '../components/Icon'
import type { Thread } from './thread'

// domain contracts shared with the API — re-exported so existing client
// imports keep working
export type { AuthProfile, ModelRef, MsgUsage, ProfileKind, ProfileStatus, SlotId } from '@nova/shared'

export type ViewName = 'home' | 'conversation' | 'projects' | 'project' | 'projectcfg'

export type SettingsTab = 'general' | 'providers' | 'assistant'

export type RespState = 'done' | 'stream' | 'error' | 'approval'
export type ThinkLevel = 'off' | 'low' | 'normal' | 'high'
export type Theme = 'light' | 'dark' | 'auto'
export type AuthView = null | 'login' | 'signup' | 'onboarding'


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
  /** B1 — server attachment id once the upload lands (real world only) */
  fileId?: string
  /** 0-100 while the upload is in flight; absent once settled */
  progress?: number
  /** validation/upload failure — the tray pill renders danger and the
   *  file never rides along with a send */
  error?: string
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
  /** B1 — server attachment id: images render the REAL bytes via an
   *  authenticated fetch; survives reloads (object URLs do not) */
  fileId?: string
  /** session-local object URL — instant thumbnail before/without a fetch */
  url?: string
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
  /** display label, e.g. THÀNH / NOVA */
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
  /** null = not named yet — the UI shows a muted “Untitled” and the first
   *  completed reply auto-names it (D3); a manual rename always sticks */
  title: string | null
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
  /** live error surfaced in the chat error card (real convs) — the specific
   *  provider message or a no-provider hint; null when there is no error */
  errorDetail: string | null
  /** B4 — server correlation id of the failed request (error card footer) */
  errorRequestId: string | null
  /** which recovery the error card offers */
  errorAction: 'providers' | 'retry' | null
  /** the conversation the error belongs to — the card shows only there, so it
   *  never bleeds onto another thread (no cross-thread clearing needed) */
  errorConv: string | null
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
  /** T8: server-side month usage rows (real mode; ephemeral, null until hydrated) */
  serverUsage: import('@nova/shared').UsageRow[] | null
  /** transient notice toast text (share-link copied, …), or null */
  toast: string | null
  /** the archived section in the sidebar is expanded (ephemeral) */
  archivedOpen: boolean
  /** the keyboard-shortcuts cheatsheet dialog is open (ephemeral) */
  cheatsheet: boolean
  /** display name of the user — drives the THÀNH label and greetings */
  userName: string
  /** signed-in account email — absent until a real session exists */
  userEmail?: string
  /** id of the signed-in account — guards against mixing two users' local data */
  accountId?: string
  /** what the assistant is called — drives the NOVA label */
  assistantName: string
  /** the user's own system instructions — prepended to every live chat */
  systemPrompt: string
  presetDefault: Record<PresetId, boolean>
  /** staged attachments, keyed by conversation id (per-conversation tray) */
  staged: Record<string, StagedFile[]>
  accent: string
  showShortcutsBar: boolean
  vw: number
}
