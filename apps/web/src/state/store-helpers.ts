// Pure, hook-free pieces of the store: URL → view mapping, the persisted
// slice, initial state construction, and small formatting helpers used
// throughout store.tsx. None of these close over React state/refs/callbacks,
// so they live here instead of inline in the 3000+ line store module —
// each is independently readable and testable without a StoreProvider.

import i18n from '../i18n'
import {
  defaultSlots,
  provDefs,
  type ModelRef,
  type SlotId,
} from '../data/defs'
import type { AuthView, NovaState, ViewName } from './types'
import { loadPersisted, PERSIST_KEY } from './persist'
import { sanitizeThreads, visiblePath } from './thread'
import type { ShareMsg } from '../services/share'
import type { SyncRecord } from './syncmap'
import type { SyncOp } from '@nova/shared'

export const ACCENT_DEFAULT = 'var(--accent)'

/** staged-attachments bucket for the Home composer — Home gets its own tray
 * so a brand-new chat never inherits another conversation's files */
export const HOME_TRAY = '__home__'

/** Navigation state derived from the URL — the single source of truth for
 *  which view/auth screen is showing and which Settings tab (if any) is open. */
export interface NavState {
  view: ViewName
  authView: AuthView
  settingsOpen: boolean
  settingsTab: import('./types').SettingsTab
  /** the conversation in the URL, or the cached last one when off a chat route */
  activeConv: string
  /** the project addressed by /projects/:projectId (view or config) */
  projectId?: string
}

export type Updater = Partial<NovaState> | ((s: NovaState) => Partial<NovaState>)

export const stagedKeyOf = (nav: NavState) => (nav.view === 'home' ? HOME_TRAY : nav.activeConv)

export const fmtTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

let toastTimer: ReturnType<typeof setTimeout> | undefined

/** show a toast, replacing any pending auto-dismiss timer for a previous one
 *  — ONE shared timer so an ollama-pull toast and a share/account toast never
 *  race each other's dismissal */
export function showToast(set: (u: Updater) => void, msg: string): void {
  clearTimeout(toastTimer)
  set({ toast: msg })
  toastTimer = setTimeout(() => set({ toast: null }), 2400)
}

// ids must be unique ACROSS SESSIONS: conversations and messages persist to
// localStorage and sync through the DO, and a session-scoped counter reborn
// at `f1` collided with persisted ids — one colliding MESSAGE id turns the
// thread tree into a cycle (the app froze in an infinite visiblePath walk).
export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `f${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** the uppercase first-name tag rendered beside a user message */
export const whoLabel = (name: string) => (name.trim().split(/\s+/)[0] || 'BẠN').toUpperCase()

export function pathToView(rawPathname: string): { view: ViewName; authView: AuthView } {
  const pathname = rawPathname || '/'
  if (pathname.startsWith('/chat/')) return { view: 'conversation', authView: null }
  if (pathname.startsWith('/projects/') && pathname.endsWith('/config'))
    return { view: 'projectcfg', authView: null }
  if (pathname.startsWith('/projects/')) return { view: 'project', authView: null }
  if (pathname === '/projects') return { view: 'projects', authView: null }
  if (pathname === '/login') return { view: 'home', authView: 'login' }
  if (pathname === '/signup') return { view: 'home', authView: 'signup' }
  if (pathname === '/onboarding') return { view: 'home', authView: 'onboarding' }
  return { view: 'home', authView: null }
}

/** fold a batch of ops into the local record mirror (pure) */
export function mergeMirror(base: SyncRecord[] | null, ops: SyncOp[]): SyncRecord[] {
  const map = new Map((base ?? []).map((r) => [`${r.table}:${r.id}`, r]))
  for (const op of ops) {
    const k = `${op.table}:${op.id}`
    if (op.kind === 'del') map.delete(k)
    else map.set(k, { table: op.table, id: op.id, value: op.value })
  }
  return [...map.values()]
}

/** the persisted slice of the store — single source for localStorage + sync */
export function persistSliceOf(s: NovaState): import('./persist').Persisted {
  return {
    theme: s.theme,
    advanced: s.advanced,
    accent: s.accent,
    userName: s.userName,
    userEmail: s.userEmail,
    accountId: s.accountId,
    assistantName: s.assistantName,
    activeSlot: s.activeSlot,
    slots: s.slots,
    focusDur: s.focusDur,
    barOn: s.barOn,
    thinkingLevel: s.thinkingLevel,
    profiles: s.profiles,
    autoRotate: s.autoRotate,
    stickyProfile: s.stickyProfile,
    tools: s.tools,
    styles: s.styles,
    systemPrompt: s.systemPrompt,
    projects: s.projects,
    presetDefault: s.presetDefault,
    conversations: s.conversations,
    activeConv: s.activeConv,
    threads: s.threads,
  }
}

/** BE4 — freeze the visible path of a thread into share-snapshot messages */
export function snapshotOfThread(th: NovaState['threads'][string] | undefined): ShareMsg[] {
  if (!th) return []
  return visiblePath(th)
    .map((m) => {
      const items = m.blocks
        .filter((b) => b.type === 'files')
        .flatMap((b) => (b.type === 'files' ? b.items : []))
        .map((f) => ({ name: f.name, kind: f.kind, ...(f.fileId ? { fileId: f.fileId } : {}) }))
      return {
        role: m.role,
        who: m.who,
        text: m.blocks
          .filter((b) => b.type === 'text')
          .map((b) => (b.type === 'text' ? b.text : ''))
          .join('\n\n')
          .trim(),
        ...(items.length ? { files: items } : {}),
      }
    })
    .filter((m) => m.text || m.files)
}

/** heal persisted slot refs whose model has been retired from the catalog —
 * providers deprecate ids over time and a stale ref would 404 every send */
export function sanitizeSlots(slots: Record<SlotId, ModelRef> | undefined): Record<SlotId, ModelRef> {
  if (!slots) return defaultSlots
  const fix = (slot: SlotId): ModelRef => {
    const ref = slots[slot]
    const prov = provDefs.find((pd) => pd.id === ref?.providerId)
    if (!prov) return defaultSlots[slot]
    // ollama models are dynamic (user-pulled) — never heal those refs away
    if (prov.id === 'ollama' && ref.modelId) return ref
    return prov.models.some((m) => m.id === ref.modelId) ? ref : defaultSlots[slot]
  }
  return { smart: fix('smart'), fast: fix('fast') }
}

export function initialState(): NovaState {
  const p = loadPersisted(PERSIST_KEY)
  const noPresets = { code: false, design: false, research: false, writing: false, data: false }
  return {
    advanced: p.advanced ?? true,
    palette: false,
    quiet: false,
    traceOpen: false,
    drawerOpen: false,
    sidebarCollapsed: false,
    renamingConv: null,
    homeProject: null,
    nudgeNonce: 0,
    openProvider: null,
    ollamaModels: [],
    ollamaPull: null,
    preview: null,
    respState: 'done',
    errorDetail: null,
    errorRequestId: null,
    errorAction: null,
    errorConv: null,
    projects: p.projects ?? [
      {
        id: 'chung',
        name: i18n.t('projects.defaultName'),
        description: '',
        accent: 'var(--faint)',
        isDefault: true,
        presets: noPresets,
        files: [],
      },
    ],
    conversations: p.conversations ?? [],
    deleting: [],
    activeConv: p.activeConv ?? '',
    threads: p.threads ? sanitizeThreads(p.threads) : {},
    editingMsg: null,
    copiedMsg: null,
    toast: null,
    archivedOpen: false,
    cheatsheet: false,
    userName: p.userName ?? i18n.t('user.name'),
    userEmail: p.userEmail,
    accountId: p.accountId,
    assistantName: p.assistantName ?? 'Nova',
    thinkingLevel: p.thinkingLevel ?? 'normal',
    theme: p.theme ?? 'light',
    focusDur: p.focusDur ?? '25',
    styles: p.styles ?? { concise: true, warm: false, formal: false, humor: false },
    systemPrompt: p.systemPrompt ?? '',
    activeSlot: p.activeSlot ?? 'smart',
    slots: sanitizeSlots(p.slots),
    // D1 — tools ship OFF by default (user opt-in per the search-chip
    // decision); a persisted choice always wins
    tools: p.tools ?? { web: false, fetch: false, files: false, bash: false },
    draft: '',
    q: '',
    typing: false,
    typingLabel: i18n.t('chat.thinkingLabel'),
    barOn: p.barOn ?? true,
    copied: false,
    // placeholder only — nothing reads this raw field directly; the real,
    // rendered value is always recomputed in the derived VM below from actual
    // usage vs. the active model's context window
    tokenPct: '0%',
    profiles: p.profiles ?? { claude: [], gemini: [], openai: [], ollama: [] },
    autoRotate: p.autoRotate ?? true,
    stickyProfile: p.stickyProfile ?? {},
    testingProfile: null,
    testDetail: null,
    updateReady: false,
    serverUsage: null,
    presetDefault: p.presetDefault ?? {
      code: false,
      design: false,
      research: true,
      writing: true,
      data: false,
    },
    staged: {},
    accent: p.accent ?? ACCENT_DEFAULT,
    showShortcutsBar: true,
    vw: typeof window !== 'undefined' ? window.innerWidth : 1200,
  }
}
