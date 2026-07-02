import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import i18n from '../i18n'
import {
  convDefs,
  presetDefs,
  projectDefs,
  provDefs,
  seedThreads,
  statusMap,
  suggestionDefs,
  type PresetId,
  type ProviderId,
} from '../data/defs'
import type {
  AuthView,
  Block,
  LiveProviderStatus,
  NovaState,
  PreviewKind,
  SettingsTab,
  StagedFile,
  Theme,
  ThinkLevel,
  ViewName,
} from './types'
import { composeReply, thinkingDelay, tokenInterval } from '../services/chat'
import { downloadFile, openFile, previewSample } from '../services/files'

const ACCENT_DEFAULT = 'var(--accent)'

/** Navigation state derived from the URL — the single source of truth for
 *  which view/auth screen is showing and which Settings tab (if any) is open. */
export interface NavState {
  view: ViewName
  authView: AuthView
  settingsOpen: boolean
  settingsTab: SettingsTab
  /** the conversation in the URL, or the cached last one when off a chat route */
  activeConv: string
  /** the project addressed by /projects/:projectId (view or config) */
  projectId?: string
}

type Navigate = ReturnType<typeof useNavigate>

function pathToView(pathname: string): { view: ViewName; authView: AuthView } {
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

// bump the version suffix whenever the persisted shape changes so stale data
// from an older schema is ignored rather than corrupting the new state
export const PERSIST_KEY = 'nova.flow.settings.v3'

interface Persisted {
  theme?: Theme
  advanced?: boolean
  accent?: string
  model?: 'opus' | 'haiku'
  focusDur?: '15' | '25' | '50'
  barOn?: boolean
  thinkingLevel?: ThinkLevel
  activeProvider?: ProviderId
  providerKeys?: NovaState['providerKeys']
  providerStatus?: NovaState['providerStatus']
  tools?: NovaState['tools']
  styles?: NovaState['styles']
  projects?: NovaState['projects']
  presetDefault?: Record<PresetId, boolean>
  conversations?: NovaState['conversations']
  activeConv?: string
  threads?: NovaState['threads']
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : {}
  } catch {
    return {}
  }
}

let _uid = 0
const uid = () => `f${++_uid}`

function initialState(): NovaState {
  const p = loadPersisted()
  return {
    advanced: p.advanced ?? true,
    palette: false,
    quiet: false,
    traceOpen: false,
    drawerOpen: false,
    sidebarCollapsed: false,
    renamingConv: null,
    preview: null,
    respState: 'done',
    projects:
      p.projects ??
      projectDefs.map((d) => ({
        ...d,
        presets:
          d.id === 'aurora'
            ? { code: false, design: true, research: true, writing: true, data: false }
            : { code: false, design: false, research: false, writing: false, data: false },
      })),
    conversations: p.conversations ?? convDefs.map((c) => ({ ...c })),
    deleting: [],
    activeConv: p.activeConv ?? 'c1',
    threads: p.threads ?? { ...seedThreads },
    thinkingLevel: p.thinkingLevel ?? 'normal',
    theme: p.theme ?? 'light',
    focusDur: p.focusDur ?? '25',
    styles: p.styles ?? { concise: true, warm: false, formal: false, humor: false },
    model: p.model ?? 'opus',
    tools: p.tools ?? { web: true, fetch: true, files: true, bash: true },
    draft: '',
    q: '',
    typing: false,
    typingLabel: i18n.t('chat.thinkingLabel'),
    barOn: p.barOn ?? true,
    copied: false,
    tokenPct: '42%',
    activeProvider: p.activeProvider ?? 'claude',
    providerKeys:
      p.providerKeys ??
      (Object.fromEntries(provDefs.map((d) => [d.id, d.fieldValue])) as Record<
        ProviderId,
        string
      >),
    providerStatus:
      p.providerStatus ??
      (Object.fromEntries(provDefs.map((d) => [d.id, d.status])) as Record<
        ProviderId,
        LiveProviderStatus
      >),
    presetDefault: p.presetDefault ?? {
      code: false,
      design: false,
      research: true,
      writing: true,
      data: false,
    },
    staged: {
      // the demo conversation's tray showcases the staged-attachment UI
      c1: [
        { id: 'demo-img', kind: 'image', name: 'moodboard.png', size: '820 KB', demo: true },
        { id: 'demo-pdf', kind: 'pdf', name: 'Brief-Aurora.pdf', size: '1.2 MB', demo: true },
      ],
    },
    accent: p.accent ?? ACCENT_DEFAULT,
    showShortcutsBar: true,
    vw: typeof window !== 'undefined' ? window.innerWidth : 1200,
  }
}

type Updater = Partial<NovaState> | ((s: NovaState) => Partial<NovaState>)

export interface Store {
  s: NovaState
  set: (u: Updater) => void
  v: ReturnType<typeof deriveValues>
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Stage a real uploaded file (image preview via object URL). */
  addUpload: (file: File) => void
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore must be used within StoreProvider')
  return c
}

export function StoreProvider({
  children,
  initial,
  onStore,
}: {
  children: ReactNode
  initial?: Partial<NovaState>
  onStore?: (store: Store) => void
}) {
  const [s, setS] = useState<NovaState>(() => ({ ...initialState(), ...initial }))
  const sRef = useRef(s)
  sRef.current = s
  const [prefersDark, setPrefersDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const t1 = useRef<ReturnType<typeof setTimeout>>(undefined)
  const t2 = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tc = useRef<ReturnType<typeof setTimeout>>(undefined)
  const delTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const set = useCallback((u: Updater) => {
    setS((prev) => ({ ...prev, ...(typeof u === 'function' ? u(prev) : u) }))
  }, [])

  // persist a slice of settings
  useEffect(() => {
    const p: Persisted = {
      theme: s.theme,
      advanced: s.advanced,
      accent: s.accent,
      model: s.model,
      focusDur: s.focusDur,
      barOn: s.barOn,
      thinkingLevel: s.thinkingLevel,
      activeProvider: s.activeProvider,
      providerKeys: s.providerKeys,
      providerStatus: s.providerStatus,
      tools: s.tools,
      styles: s.styles,
      projects: s.projects,
      presetDefault: s.presetDefault,
      conversations: s.conversations,
      activeConv: s.activeConv,
      threads: s.threads,
    }
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(p))
    } catch {
      /* ignore */
    }
  }, [
    s.theme,
    s.advanced,
    s.accent,
    s.model,
    s.focusDur,
    s.barOn,
    s.thinkingLevel,
    s.activeProvider,
    s.providerKeys,
    s.providerStatus,
    s.tools,
    s.styles,
    s.projects,
    s.presetDefault,
    s.conversations,
    s.activeConv,
    s.threads,
  ])

  // resize tracking
  useEffect(() => {
    const onResize = () => set({ vw: window.innerWidth })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [set])

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = (e.key || '').toLowerCase()
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault()
        set((x) => ({ palette: !x.palette }))
      } else if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        set((x) => ({ quiet: !x.quiet }))
      } else if (e.key === 'Escape') {
        // Radix overlays close themselves on Escape; this covers the
        // store-driven surfaces (palette, quiet, drawer, preview).
        set({ palette: false, quiet: false, drawerOpen: false, preview: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  // keep the conversation pinned to the bottom while it grows (append or
  // stream tick) — but only when the user is already near the bottom, so
  // reading history is never yanked away
  const activeThreadRef = s.threads[s.activeConv]
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [activeThreadRef])

  useEffect(
    () => () => {
      clearTimeout(t1.current)
      clearTimeout(t2.current)
      clearInterval(tc.current)
      Object.values(delTimers.current).forEach((t) => clearTimeout(t))
    },
    [],
  )

  const navigate = useNavigate()
  const pathname = useRouterState({ select: (st) => st.location.pathname })
  const settingsTabSearch = useRouterState({
    select: (st) => (st.location.search as { settings?: SettingsTab }).settings,
  })
  const params = useParams({ strict: false }) as {
    convId?: string
    projectId?: string
  }
  const routeConvId = params.convId
  const routeProjectId = params.projectId

  const { view, authView } = useMemo(() => pathToView(pathname), [pathname])
  const nav: NavState = useMemo(
    () => ({
      view,
      authView,
      settingsOpen: settingsTabSearch != null,
      settingsTab: settingsTabSearch ?? 'general',
      activeConv: routeConvId ?? s.activeConv,
      projectId: routeProjectId,
    }),
    [view, authView, settingsTabSearch, routeConvId, routeProjectId, s.activeConv],
  )
  const navRef = useRef(nav)
  navRef.current = nav

  const go = useCallback(
    (view: ViewName) => {
      set({ palette: false, drawerOpen: false })
      switch (view) {
        case 'home':
          navigate({ to: '/new' })
          break
        case 'conversation':
          navigate({ to: '/chat/$convId', params: { convId: navRef.current.activeConv } })
          break
        case 'projects':
          navigate({ to: '/projects' })
          break
        case 'project': {
          const pid =
            sRef.current.conversations.find((c) => c.id === navRef.current.activeConv)
              ?.projectId ?? 'chung'
          navigate({ to: '/projects/$projectId', params: { projectId: pid } })
          break
        }
        case 'projectcfg': {
          const pid =
            sRef.current.conversations.find((c) => c.id === navRef.current.activeConv)
              ?.projectId ?? 'chung'
          navigate({ to: '/projects/$projectId/config', params: { projectId: pid } })
          break
        }
      }
    },
    [set, navigate],
  )

  const send = useCallback(() => {
    // empty composer is a no-op: never send a message the user didn't write
    if (!sRef.current.draft.trim()) return
    // the URL owns the active conversation; Home (no :convId) falls back to the
    // last-selected cache so a Home-composed message lands somewhere sensible
    const convId = navRef.current.activeConv
    setS((prev) => {
      const t = (prev.draft || '').trim()
      if (!t) return prev
      const conv = convId
      clearTimeout(t1.current)
      clearTimeout(t2.current)
      clearInterval(tc.current)

      const stagedNow = prev.staged[conv] ?? []
      const userBlocks: Block[] = [{ type: 'text', text: t }]
      if (stagedNow.length)
        userBlocks.push({
          type: 'files',
          items: stagedNow.map((f) => ({
            kind: f.kind,
            name: f.name,
            meta: f.size,
            image: f.kind === 'image',
            open: f.kind,
          })),
        })

      const projName =
        prev.projects.find(
          (p) => p.id === prev.conversations.find((c) => c.id === conv)?.projectId,
        )?.name ?? 'Chung'
      const reply = composeReply(t, {
        model: prev.model,
        thinking: prev.thinkingLevel,
        project: projName,
      })
      const words = reply.split(' ')
      const step = tokenInterval(prev.model)

      // after a "thinking" pause, append an empty Nova bubble and stream into it
      t1.current = setTimeout(() => {
        set((x) => ({
          typingLabel: i18n.t('chat.writingLabel'),
          threads: {
            ...x.threads,
            [conv]: [
              ...(x.threads[conv] ?? []),
              { id: uid(), role: 'assistant', who: 'NOVA', blocks: [{ type: 'text', size: 'lead', text: '' }] },
            ],
          },
        }))
        let i = 0
        tc.current = setInterval(() => {
          i += 1
          set((x) => {
            const thread = (x.threads[conv] ?? []).slice()
            thread[thread.length - 1] = {
              ...thread[thread.length - 1],
              blocks: [{ type: 'text', size: 'lead', text: words.slice(0, i).join(' ') }],
            }
            return { threads: { ...x.threads, [conv]: thread } }
          })
          if (i >= words.length) {
            clearInterval(tc.current)
            set({ typing: false, tokenPct: `${Math.min(98, 42 + words.length)}%` })
          }
        }, step)
      }, thinkingDelay(prev.thinkingLevel))

      return {
        ...prev,
        threads: {
          ...prev.threads,
          [conv]: [
            ...(prev.threads[conv] ?? []),
            { id: uid(), role: 'user', who: 'MINH', blocks: userBlocks },
          ],
        },
        // sending consumes this conversation's staged attachments
        staged: { ...prev.staged, [conv]: [] },
        draft: '',
        typing: true,
        typingLabel:
          prev.thinkingLevel === 'off' ? i18n.t('chat.writingLabel') : i18n.t('chat.thinkingLabel'),
      }
    })
    navigate({ to: '/chat/$convId', params: { convId } })
    // sending always snaps to the bottom (after the append renders)
    setTimeout(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 0)
  }, [set, navigate])

  const copyCode = useCallback(() => {
    set({ copied: true })
    try {
      void navigator.clipboard?.writeText('plan.md')
    } catch {
      /* ignore */
    }
    clearTimeout(tc.current)
    tc.current = setTimeout(() => set({ copied: false }), 1400)
  }, [set])

  // stop an in-flight real streamed reply (clears the thinking/streaming timers)
  const stop = useCallback(() => {
    clearTimeout(t1.current)
    clearTimeout(t2.current)
    clearInterval(tc.current)
    set({ typing: false })
  }, [set])

  const addUpload = useCallback(
    (file: File) => {
      const isImg = file.type.startsWith('image/')
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      let kind: PreviewKind = 'pdf'
      if (isImg) kind = 'image'
      else if (ext === 'pdf') kind = 'pdf'
      else if (['py', 'js', 'ts', 'tsx', 'json', 'sh'].includes(ext)) kind = 'code'
      else if (ext === 'csv') kind = 'csv'
      else if (ext === 'md') kind = 'md'
      const url = isImg ? URL.createObjectURL(file) : undefined
      const size =
        file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`
      const item: StagedFile = { id: uid(), kind, name: file.name, size, url }
      const conv = navRef.current.activeConv
      set((x) => ({
        staged: { ...x.staged, [conv]: [...(x.staged[conv] ?? []), item] },
      }))
    },
    [set],
  )

  // optimistic conversation delete: flag it, then remove for real after a 5s
  // undo window so an accidental delete is recoverable
  const delConv = useCallback(
    (id: string) => {
      set((x) => ({ deleting: x.deleting.includes(id) ? x.deleting : [...x.deleting, id] }))
      clearTimeout(delTimers.current[id])
      delTimers.current[id] = setTimeout(() => {
        delete delTimers.current[id]
        const next = sRef.current.conversations.filter((k) => k.id !== id)[0]?.id ?? ''
        set((x) => {
          const conversations = x.conversations.filter((k) => k.id !== id)
          const threads = { ...x.threads }
          delete threads[id]
          return {
            conversations,
            threads,
            activeConv: x.activeConv === id ? next : x.activeConv,
            deleting: x.deleting.filter((d) => d !== id),
          }
        })
        // if the deleted conversation is the one in the URL, leave it
        if (navRef.current.activeConv === id) {
          navigate(next ? { to: '/chat/$convId', params: { convId: next } } : { to: '/' })
        }
      }, 5000)
    },
    [set, navigate],
  )

  const undoDelete = useCallback(
    (id: string) => {
      clearTimeout(delTimers.current[id])
      delete delTimers.current[id]
      set((x) => ({ deleting: x.deleting.filter((d) => d !== id) }))
    },
    [set],
  )

  // prefers-color-scheme tracking (for theme: auto)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = s.theme === 'dark' || (s.theme === 'auto' && prefersDark)

  // subscribing here re-renders the provider (and recomputes the VM strings)
  // when the language changes
  const { t } = useTranslation()

  const v = useMemo(
    () =>
      deriveValues(s, set, {
        go,
        send,
        stop,
        copyCode,
        dark,
        scrollRef,
        delConv,
        undoDelete,
        nav,
        navigate,
        t,
      }),
    [s, set, go, send, stop, copyCode, dark, delConv, undoDelete, nav, navigate, t],
  )

  const store: Store = useMemo(
    () => ({ s, set, v, scrollRef, addUpload }),
    [s, set, v, addUpload],
  )

  // expose the live store to tests (no-op in production where onStore is unset).
  // Called during render rather than in an effect so capture does not depend on
  // effect-flush timing, which router transitions can disrupt across tests.
  onStore?.(store)

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

// ---------------------------------------------------------------------------
// Derived values — a faithful port of the prototype's renderVals()
// ---------------------------------------------------------------------------
function deriveValues(
  s: NovaState,
  set: (u: Updater) => void,
  extra: {
    go: (v: ViewName) => void
    send: () => void
    stop: () => void
    copyCode: () => void
    dark: boolean
    scrollRef: React.RefObject<HTMLDivElement | null>
    delConv: (id: string) => void
    undoDelete: (id: string) => void
    nav: NavState
    navigate: Navigate
    t: TFunction
  },
) {
  const { go, send, stop, copyCode, dark, scrollRef, delConv, undoDelete, nav, navigate, t } =
    extra
  const activeConv = nav.activeConv
  const activeConvObj = s.conversations.find((c) => c.id === activeConv)
  const activeProjectId = activeConvObj?.projectId ?? 'chung'
  const activeProject = s.projects.find((p) => p.id === activeProjectId) ?? s.projects[0]
  const convCount = (pid: string) => s.conversations.filter((c) => c.projectId === pid).length
  // the project addressed by the URL (project view / config routes)
  const viewProject = s.projects.find((p) => p.id === nav.projectId) ?? activeProject
  // where the user currently *is*: the viewed project on /projects routes,
  // otherwise the active conversation's project. Drives the sidebar scope and
  // which project/conversation reads as active.
  const currentProjectId = viewProject?.id ?? 'chung'
  const currentProjectName = viewProject?.name ?? 'Chung'

  // ----- project CRUD (fake store — no backend) -----
  const createProject = (name: string, description: string) => {
    const id = uid()
    set((x) => ({
      projects: [
        ...x.projects,
        { id, name, description, accent: ACCENT_DEFAULT, presets: { ...x.presetDefault } },
      ],
    }))
    navigate({ to: '/projects/$projectId', params: { projectId: id } })
  }
  const editProject = (id: string, patch: { name?: string; description?: string }) =>
    set((x) => ({ projects: x.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const deleteProject = (id: string) => {
    set((x) => ({
      projects: x.projects.filter((p) => p.id !== id),
      // never orphan conversations — reassign them to the default project
      conversations: x.conversations.map((c) =>
        c.projectId === id ? { ...c, projectId: 'chung' } : c,
      ),
    }))
    navigate({ to: '/projects' })
  }
  const moveConv = (convId: string, projectId: string) =>
    set((x) => ({
      conversations: x.conversations.map((c) => (c.id === convId ? { ...c, projectId } : c)),
    }))
  const toggleProjectPreset = (projectId: string, pid: PresetId) =>
    set((x) => ({
      projects: x.projects.map((p) =>
        p.id === projectId ? { ...p, presets: { ...p.presets, [pid]: !p.presets[pid] } } : p,
      ),
    }))
  const startChat = (projectId: string) => {
    const id = uid()
    set((x) => ({
      conversations: [{ id, title: t('nav.newChat'), projectId }, ...x.conversations],
      threads: { ...x.threads, [id]: [] },
      activeConv: id,
      respState: 'done',
      palette: false,
      drawerOpen: false,
    }))
    navigate({ to: '/chat/$convId', params: { convId: id } })
  }

  const sortConvs = (list: NovaState['conversations']) =>
    [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const mapConv = (c: NovaState['conversations'][number]) => {
    // bg-highlight only when this conversation is the one actually open; the
    // busy pulse follows the generating conversation across any route
    const isActive = nav.view === 'conversation' && c.id === activeConv
    return {
      id: c.id,
      title: c.title,
      active: isActive,
      pinned: !!c.pinned,
      busy: c.id === activeConv && s.typing,
      deleting: s.deleting.includes(c.id),
      bg: isActive ? 'var(--accent-soft)' : 'transparent',
      fg: isActive ? 'var(--text)' : 'var(--text-2)',
      onSelect: () => set({ activeConv: c.id, palette: false, drawerOpen: false }),
      open: () => {
        set({ activeConv: c.id, palette: false, drawerOpen: false })
        navigate({ to: '/chat/$convId', params: { convId: c.id } })
      },
      rename: () => set({ renamingConv: c.id }),
      pin: () =>
        set((x) => ({
          conversations: x.conversations.map((k) =>
            k.id === c.id ? { ...k, pinned: !k.pinned } : k,
          ),
        })),
      del: () => delConv(c.id),
      undo: () => undoDelete(c.id),
    }
  }

  const accent = s.accent ?? ACCENT_DEFAULT
  const adv = s.advanced
  const accentText = 'var(--accent-text)'
  const isMobile = s.vw < 880
  const isDesktop = !isMobile
  const rs = s.respState
  const activeThread = s.threads[activeConv] ?? []
  const activeStaged = s.staged[activeConv] ?? []
  const activeIsDemo = !!activeConvObj?.demo

  const tk: (keyof NovaState['tools'])[] = ['web', 'fetch', 'files', 'bash']
  const toolToggle = (k: keyof NovaState['tools']) => () =>
    set((x) => ({ tools: { ...x.tools, [k]: !x.tools[k] } }))
  const chk = (k: keyof NovaState['tools']) => (s.tools[k] ? '✓' : '')
  const rowFg = (k: keyof NovaState['tools']) => (s.tools[k] ? accentText : 'var(--text-2)')
  const activeCount = tk.filter((k) => s.tools[k]).length

  const mkPreset = (
    map: Record<PresetId, boolean>,
    tog: (id: PresetId) => void,
  ) =>
    presetDefs.map((p) => {
      const on = !!map[p.id]
      return {
        id: p.id,
        name: t(`vocab.presets.${p.id}.name`),
        glyph: p.glyph,
        color: p.color,
        badgeBg: p.badgeBg,
        help: t(`vocab.presets.${p.id}.help`),
        tools: p.tools.map((k) => ({ t: t(`vocab.toolChips.${k}`) })),
        showTools: p.tools.length > 0,
        on,
        toggle: () => tog(p.id),
        trackBg: on ? accent : 'var(--border)',
        knobTx: on ? 'translateX(17px)' : 'translateX(0)',
        border: on ? 'var(--accent-line)' : 'var(--border)',
        bg: 'var(--panel)',
      }
    })

  const togDef = (id: PresetId) =>
    set((x) => ({ presetDefault: { ...x.presetDefault, [id]: !x.presetDefault[id] } }))

  const projActiveNames =
    presetDefs
      .filter((p) => viewProject.presets[p.id])
      .map((p) => t(`vocab.presets.${p.id}.name`))
      .join(' · ') || t('projects.config.skillsBasic')

  const liveStatusMap: Record<LiveProviderStatus, { badge: string; fg: string; bg: string }> = {
    connected: { ...statusMap.connected, badge: t('vocab.status.connected') },
    add: { ...statusMap.add, badge: t('vocab.status.add') },
    local: { ...statusMap.local, badge: t('vocab.status.local') },
    testing: { badge: t('vocab.status.testing'), fg: 'var(--warn-text)', bg: 'var(--warn-bg)' },
    error: { badge: t('vocab.status.error'), fg: 'var(--danger-text)', bg: 'var(--danger-bg)' },
  }
  const setProviderKey = (id: ProviderId, value: string) =>
    set((x) => ({ providerKeys: { ...x.providerKeys, [id]: value } }))
  const testProvider = (id: ProviderId) => {
    set((x) => ({ providerStatus: { ...x.providerStatus, [id]: 'testing' } }))
    setTimeout(() => {
      set((x) => {
        const ok = (x.providerKeys[id] || '').trim().length > 4
        const next: LiveProviderStatus = ok ? (id === 'ollama' ? 'local' : 'connected') : 'error'
        return { providerStatus: { ...x.providerStatus, [id]: next } }
      })
    }, 900)
  }
  const providers = provDefs.map((p) => {
    const active = s.activeProvider === p.id
    const status = s.providerStatus[p.id]
    const st = liveStatusMap[status]
    return {
      id: p.id,
      active,
      select: () => set({ activeProvider: p.id }),
      name: p.id === 'ollama' ? t('vocab.providers.ollama.name') : p.name,
      sub: t(`vocab.providers.${p.id}.sub`),
      glyph: p.glyph,
      badgeBg: p.badgeBg,
      badgeFg: p.badgeFg,
      badge: st.badge,
      statusFg: st.fg,
      statusBg: st.bg,
      rec: p.rec ? t('vocab.recommended') : '',
      border: active ? accent : 'var(--border)',
      bg: 'var(--panel)',
      radioBd: active ? accent : 'var(--border)',
      radioBg: active ? accent : 'transparent',
      radioDot: active ? 'var(--panel)' : 'transparent',
      showKey: active,
      fieldLabel: p.field === 'key' ? t('settings.apiKey') : t('settings.endpoint'),
      fieldValue: s.providerKeys[p.id],
      setKey: (value: string) => setProviderKey(p.id, value),
      test: () => testProvider(p.id),
      testing: status === 'testing',
      fieldAction: p.field === 'key' ? t('settings.saveTest') : t('settings.test'),
      models: p.models.map((m, i) => ({
        name: m,
        fg: i === 0 ? accentText : 'var(--muted)',
        bg: i === 0 ? 'var(--accent-soft)' : 'var(--panel)',
        bd: i === 0 ? 'var(--accent-line)' : 'var(--border)',
      })),
    }
  })
  // sidebar data
  const sideProjects = s.projects.map((p) => ({
    id: p.id,
    name: p.name,
    dot: p.accent,
    count: String(convCount(p.id)),
    bg: p.id === currentProjectId ? 'var(--accent-soft)' : 'transparent',
    fg: p.id === currentProjectId ? 'var(--text)' : 'var(--text-2)',
  }))
  const sideConvs = sortConvs(
    s.conversations.filter((c) => c.projectId === currentProjectId),
  ).map(mapConv)

  const pickProjects = s.projects.map((p) => ({
    id: p.id,
    name: p.name,
    dot: p.accent,
    bg: p.id === activeProjectId ? 'var(--accent-soft)' : 'transparent',
    check: p.id === activeProjectId ? '✓' : '',
    pick: () => moveConv(activeConv, p.id),
  }))

  const suggestions = suggestionDefs.map((g) => ({
    ...g,
    title: t(`vocab.suggestions.${g.id}.title`),
    sub: t(`vocab.suggestions.${g.id}.sub`),
    go: () => go('conversation'),
  }))

  const stBg = (val: string) => (rs === val ? 'var(--panel)' : 'transparent')
  const stFg = (val: string) => (rs === val ? 'var(--text)' : 'var(--muted)')

  return {
    webCheck: chk('web'),
    fetchCheck: chk('fetch'),
    filesCheck: chk('files'),
    bashCheck: chk('bash'),
    webRowFg: rowFg('web'),
    fetchRowFg: rowFg('fetch'),
    filesRowFg: rowFg('files'),
    bashRowFg: rowFg('bash'),
    toggle_web: toolToggle('web'),
    toggle_fetch: toolToggle('fetch'),
    toggle_files: toolToggle('files'),
    toggle_bash: toolToggle('bash'),
    accent,
    advanced: adv,
    simpleMode: !adv,
    isDesktop,
    isMobile,
    isHome: nav.view === 'home',
    isConv: nav.view === 'conversation',
    isProjects: nav.view === 'projects',
    isProject: nav.view === 'project',
    isProjectCfg: nav.view === 'projectcfg',
    activeConv,
    // sidebar
    showSidebar: isDesktop,
    sidebarW: s.sidebarCollapsed ? '62px' : '256px',
    sidebarExpanded: !s.sidebarCollapsed,
    sidebarCollapsed: s.sidebarCollapsed,
    railJustify: s.sidebarCollapsed ? 'center' : 'flex-start',
    collapseSidebar: () =>
      set((x) => ({ sidebarCollapsed: !x.sidebarCollapsed })),
    sideProjects,
    sideConvs,
    pickProjects,
    setBg: nav.settingsOpen ? 'var(--accent-soft)' : 'transparent',
    setFg: nav.settingsOpen ? accentText : 'var(--text-2)',
    settingsOpen: nav.settingsOpen,
    settingsTab: nav.settingsTab,
    openSettings: (tab: SettingsTab) => {
      set({ palette: false, drawerOpen: false })
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: tab }) })
    },
    closeSettings: () =>
      navigate({
        to: '.',
        search: (prev) => {
          const next = { ...prev }
          delete next.settings
          return next
        },
      }),
    setSettingsTab: (tab: SettingsTab) =>
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: tab }) }),
    drawerOpen: s.drawerOpen,
    openDrawer: () => set({ drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false }),
    // top
    // the top bar reflects the conversation currently open, not a fixed project
    headerTitle:
      s.conversations.find((c) => c.id === activeConv)?.title ?? t('chat.headerFallback'),
    palette: s.palette,
    quiet: s.quiet,
    notQuiet: !s.quiet,
    showMeter: isDesktop,
    meterLabel: t('meter.label'),
    modelLabel: s.model === 'opus' ? t('model.smart') : t('model.fast'),
    modelAMode: t('model.smart'),
    modelBMode: t('model.fast'),
    modelADesc: t('model.smartDesc'),
    modelBDesc: t('model.fastDesc'),
    checkA: s.model === 'opus' ? '✓' : '',
    checkB: s.model === 'haiku' ? '✓' : '',
    modelMenuLabel: t('model.menuLabel'),
    // conversation states
    respState: rs,
    isStream: rs === 'stream',
    isDone: rs === 'done',
    isError: rs === 'error',
    showTrace: rs === 'done' || rs === 'stream',
    traceIconBg: 'var(--accent-soft)',
    traceIconFg: accent,
    traceSummary:
      rs === 'stream' ? t('chat.traceSummaryStream') : t('chat.traceSummaryDone'),
    traceCaret: s.traceOpen ? t('chat.traceHide') : rs === 'stream' ? '' : t('chat.traceCaretDone'),
    toggleTrace: () => set((x) => ({ traceOpen: !x.traceOpen })),
    traceOpen: s.traceOpen,
    setStream: () => set({ respState: 'stream' }),
    setDone: () => set({ respState: 'done' }),
    setError: () => set({ respState: 'error' }),
    stBgStream: stBg('stream'),
    stFgStream: stFg('stream'),
    stBgDone: stBg('done'),
    stFgDone: stFg('done'),
    stBgError: stBg('error'),
    stFgError: stFg('error'),
    // composer
    chatProject: activeProject?.name ?? 'Chung',
    staged: activeStaged,
    hasStaged: activeStaged.length > 0,
    removeStaged: (id: string) =>
      set((x) => ({
        staged: {
          ...x.staged,
          [activeConv]: (x.staged[activeConv] ?? []).filter((f) => f.id !== id),
        },
      })),
    openLightbox: () => set({ preview: { kind: 'image', name: 'moodboard.png' } }),
    openStaged: (f: StagedFile) =>
      set({ preview: { kind: f.kind, name: f.name, url: f.url } }),
    preview: s.preview,
    hasPreview: !!s.preview,
    previewName: s.preview?.name || '',
    previewUrl: s.preview?.url,
    isPrevImage: s.preview?.kind === 'image',
    isPrevPdf: s.preview?.kind === 'pdf',
    isPrevCode: s.preview?.kind === 'code',
    isPrevCsv: s.preview?.kind === 'csv',
    isPrevMd: s.preview?.kind === 'md',
    previewMeta:
      (
        {
          image: '1440×960 · 820 KB',
          pdf: '8 trang · 1.2 MB',
          code: 'Python · 1.4 KB',
          csv: '412 dòng · 18 KB',
          md: 'Markdown · 2.1 KB',
        } as Record<string, string>
      )[s.preview?.kind || ''] || '',
    openPdf: () => set({ preview: { kind: 'pdf', name: 'Brief-Aurora.pdf' } }),
    openCode: () => set({ preview: { kind: 'code', name: 'analyze.py' } }),
    openCsv: () => set({ preview: { kind: 'csv', name: 'Khảo-sát.csv' } }),
    openMd: () => set({ preview: { kind: 'md', name: 'plan.md' } }),
    closePreview: () => set({ preview: null }),
    downloadPreview: () => {
      if (!s.preview) return
      const { type, body } = previewSample(s.preview.kind)
      downloadFile(s.preview.name, body, type)
    },
    openPreviewExternal: () => {
      if (!s.preview) return
      const { type, body } = previewSample(s.preview.kind)
      openFile(body, type)
    },
    scrollRef,
    // theme: CSS owns the palette; we only signal which sheet we're on
    dark,
    themeClass: dark ? 'dark' : '',
    // auth
    isOnboarding: nav.authView === 'onboarding',
    isLoginForm: nav.authView === 'login' || nav.authView === 'signup',
    finishOnboarding: () => navigate({ to: '/' }),
    showAuth: nav.authView !== null,
    loggedIn: nav.authView === null,
    isLogin: nav.authView !== 'signup',
    logout: () => navigate({ to: '/login' }),
    doLogin: () =>
      navigate(nav.authView === 'signup' ? { to: '/onboarding' } : { to: '/' }),
    authTitle: nav.authView === 'signup' ? t('auth.signupTitle') : t('auth.loginTitle'),
    authSub: nav.authView === 'signup' ? t('auth.signupSub') : t('auth.loginSub'),
    authCta: nav.authView === 'signup' ? t('auth.signupCta') : t('auth.loginCta'),
    authToggleText: nav.authView === 'signup' ? t('auth.haveAccount') : t('auth.noAccount'),
    authToggleLink: nav.authView === 'signup' ? t('auth.switchLogin') : t('auth.switchSignup'),
    authToggleAct:
      nav.authView === 'signup'
        ? () => navigate({ to: '/login' })
        : () => navigate({ to: '/signup' }),
    // approval
    respApproval: rs === 'approval',
    setApproval: () => set({ respState: 'approval', traceOpen: false }),
    approveTool: () => set({ respState: 'done' }),
    denyTool: () => set({ respState: 'done' }),
    stBgApproval: rs === 'approval' ? 'var(--panel)' : 'transparent',
    stFgApproval: rs === 'approval' ? 'var(--text)' : 'var(--muted)',
    // empty / demo — the scripted showcase thread belongs to the demo
    // conversation only; every other conversation shows its real thread
    isEmptyChat: activeThread.length === 0 && !activeIsDemo,
    hasDemo: activeIsDemo,
    // thinking
    thinkingLevel: s.thinkingLevel,
    thinkLabel: t(
      (
        {
          off: 'composer.thinkOff',
          low: 'composer.thinkLow',
          normal: 'composer.thinkNormal',
          high: 'composer.thinkHigh',
        } as const
      )[s.thinkingLevel] ?? 'composer.thinkNormal',
    ),
    showThinkChip: s.thinkingLevel !== 'off',
    thinkChkOff: s.thinkingLevel === 'off' ? '✓' : '',
    thinkChkLow: s.thinkingLevel === 'low' ? '✓' : '',
    thinkChkNormal: s.thinkingLevel === 'normal' ? '✓' : '',
    thinkChkHigh: s.thinkingLevel === 'high' ? '✓' : '',
    setThinkOff: () => set({ thinkingLevel: 'off' }),
    setThinkLow: () => set({ thinkingLevel: 'low' }),
    setThinkNormal: () => set({ thinkingLevel: 'normal' }),
    setThinkHigh: () => set({ thinkingLevel: 'high' }),
    // theme controls
    focusVal: s.focusDur,
    setLight: () => set({ theme: 'light' }),
    setDark: () => set({ theme: 'dark' }),
    setAuto: () => set({ theme: 'auto' }),
    themeVal: s.theme,
    themeLightBd: s.theme === 'light' ? accent : 'var(--border)',
    themeLightBg: s.theme === 'light' ? 'var(--accent-soft)' : 'transparent',
    themeLightFg: s.theme === 'light' ? accentText : 'var(--muted)',
    themeDarkBd: s.theme === 'dark' ? accent : 'var(--border)',
    themeDarkBg: s.theme === 'dark' ? 'var(--accent-soft)' : 'transparent',
    themeDarkFg: s.theme === 'dark' ? accentText : 'var(--muted)',
    themeAutoBd: s.theme === 'auto' ? accent : 'var(--border)',
    themeAutoBg: s.theme === 'auto' ? 'var(--accent-soft)' : 'transparent',
    themeAutoFg: s.theme === 'auto' ? accentText : 'var(--muted)',
    // focus duration
    setF15: () => set({ focusDur: '15' }),
    setF25: () => set({ focusDur: '25' }),
    setF50: () => set({ focusDur: '50' }),
    f15Bd: s.focusDur === '15' ? accent : 'var(--border)',
    f15Bg: s.focusDur === '15' ? 'var(--accent-soft)' : 'transparent',
    f15Fg: s.focusDur === '15' ? accentText : 'var(--muted)',
    f25Bd: s.focusDur === '25' ? accent : 'var(--border)',
    f25Bg: s.focusDur === '25' ? 'var(--accent-soft)' : 'transparent',
    f25Fg: s.focusDur === '25' ? accentText : 'var(--muted)',
    f50Bd: s.focusDur === '50' ? accent : 'var(--border)',
    f50Bg: s.focusDur === '50' ? 'var(--accent-soft)' : 'transparent',
    f50Fg: s.focusDur === '50' ? accentText : 'var(--muted)',
    // styles
    styleConcise: s.styles.concise,
    styleWarm: s.styles.warm,
    styleFormal: s.styles.formal,
    styleHumor: s.styles.humor,
    toggleConcise: () => set((x) => ({ styles: { ...x.styles, concise: !x.styles.concise } })),
    toggleWarm: () => set((x) => ({ styles: { ...x.styles, warm: !x.styles.warm } })),
    toggleFormal: () => set((x) => ({ styles: { ...x.styles, formal: !x.styles.formal } })),
    toggleHumor: () => set((x) => ({ styles: { ...x.styles, humor: !x.styles.humor } })),
    stConciseBd: s.styles.concise ? accent : 'var(--border)',
    stConciseBg: s.styles.concise ? 'var(--accent-soft)' : 'transparent',
    stConciseFg: s.styles.concise ? accentText : 'var(--muted)',
    stWarmBd: s.styles.warm ? accent : 'var(--border)',
    stWarmBg: s.styles.warm ? 'var(--accent-soft)' : 'transparent',
    stWarmFg: s.styles.warm ? accentText : 'var(--muted)',
    stFormalBd: s.styles.formal ? accent : 'var(--border)',
    stFormalBg: s.styles.formal ? 'var(--accent-soft)' : 'transparent',
    stFormalFg: s.styles.formal ? accentText : 'var(--muted)',
    stHumorBd: s.styles.humor ? accent : 'var(--border)',
    stHumorBg: s.styles.humor ? 'var(--accent-soft)' : 'transparent',
    stHumorFg: s.styles.humor ? accentText : 'var(--muted)',
    bashLabel: t('composer.toolBash'),
    showComposerHint: true,
    // bottom bar
    showBar: s.showShortcutsBar && s.barOn && !s.quiet && isDesktop,
    // sizing
    heroSize: isMobile ? '38px' : '52px',
    pageTitle: isMobile ? '34px' : '44px',
    homePad: isMobile ? '28px 18px 40px' : '40px 16px 48px',
    convPad: isMobile ? '24px 18px 24px' : '36px 16px 26px',
    pagePad: isMobile ? '28px 18px 40px' : '44px 16px 50px',
    sugCols: isMobile ? '1fr' : '1fr 1fr',
    paletteTop: isMobile ? '7%' : '20%',
    // data
    suggestions,
    providers,
    presetsProj: mkPreset(viewProject.presets, (pid) => toggleProjectPreset(viewProject.id, pid)),
    presetsLib: mkPreset(s.presetDefault, togDef),
    projActiveNames,
    projects: s.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      dot: p.accent,
      isDefault: !!p.isDefault,
      count: convCount(p.id),
      threads: `${convCount(p.id)} luồng`,
    })),
    activeProjectId,
    activeProjectName: activeProject?.name ?? 'Chung',
    currentProjectName,
    viewProjectId: viewProject?.id ?? 'chung',
    viewProjectName: viewProject?.name ?? 'Chung',
    viewProjectDescription: viewProject?.description ?? '',
    viewProjectAccent: viewProject?.accent ?? 'var(--faint)',
    viewProjectIsDefault: !!viewProject?.isDefault,
    viewProjectCount: convCount(viewProject?.id ?? 'chung'),
    viewProjectConvs: sortConvs(
      s.conversations.filter((c) => c.projectId === (viewProject?.id ?? 'chung')),
    ).map(mapConv),
    createProject,
    editProject,
    deleteProject,
    newChatInProject: startChat,
    // command-palette search space — conversations across ALL projects + projects
    paletteConvs: sortConvs(s.conversations).map((c) => ({
      id: c.id,
      title: c.title,
      projectName: s.projects.find((p) => p.id === c.projectId)?.name ?? 'Chung',
      open: () => {
        set({ activeConv: c.id, palette: false, q: '' })
        navigate({ to: '/chat/$convId', params: { convId: c.id } })
      },
    })),
    paletteProjects: s.projects.map((p) => ({
      id: p.id,
      name: p.name,
      dot: p.accent,
      open: () => {
        set({ palette: false, q: '' })
        navigate({ to: '/projects/$projectId', params: { projectId: p.id } })
      },
    })),
    // rename dialog (paper replacement for window.prompt)
    renamingConv: s.renamingConv,
    renameTitle: s.conversations.find((c) => c.id === s.renamingConv)?.title ?? '',
    closeRename: () => set({ renamingConv: null }),
    saveRename: (title: string) =>
      set((x) => ({
        renamingConv: null,
        conversations: x.conversations.map((k) =>
          k.id === x.renamingConv && title.trim() ? { ...k, title: title.trim() } : k,
        ),
      })),
    // advanced toggle
    advTrackBg: adv ? accent : 'var(--border)',
    advKnobTx: adv ? 'translateX(19px)' : 'translateX(0)',
    advBorder: adv ? 'var(--accent-line)' : 'var(--border)',
    advBg: 'var(--panel)',
    toggleAdvanced: () => set((x) => ({ advanced: !x.advanced })),
    barOn: s.barOn,
    toggleBar: () => set((x) => ({ barOn: !x.barOn })),
    draft: s.draft,
    q: s.q,
    sent: activeThread,
    typing: s.typing,
    typingLabel: s.typingLabel,
    activeCount,
    tokenPct: s.tokenPct,
    tokenLabel: t('meter.tokenLabel'),
    tokenDetail: t('meter.tokenDetail'),
    copyLabel: s.copied ? t('common.copied') : t('common.copy'),
    copied: s.copied,
    quietClock: '24:13',
    // nav handlers
    goHome: () => go('home'),
    goConv: () => go('conversation'),
    goProjects: () => go('projects'),
    goProject: () => go('project'),
    goProjectCfg: () => go('projectcfg'),
    goAssistant: () => {
      set({ palette: false, drawerOpen: false })
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: 'assistant' }) })
    },
    goSettings: () => {
      set({ palette: false, drawerOpen: false })
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: 'general' }) })
    },
    togglePalette: () => set((x) => ({ palette: !x.palette, drawerOpen: false })),
    closeMenus: () => set({ palette: false }),
    pickOpus: () => set({ model: 'opus' }),
    pickHaiku: () => set({ model: 'haiku' }),
    enterQuiet: () => set({ quiet: true }),
    exitQuiet: () => set({ quiet: false }),
    onDraft: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set({ draft: e.target.value }),
    onQ: (e: React.ChangeEvent<HTMLInputElement>) => set({ q: e.target.value }),
    // desktop: Enter sends, Shift+Enter inserts a newline; on mobile Enter is
    // always a newline and sending happens through the send button
    onKey: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && isDesktop) {
        e.preventDefault()
        send()
      }
    },
    send,
    stop,
    canSend: s.draft.trim().length > 0,
    copyCode,
    pConvAurora: () => go('conversation'),
    pProjects: () => go('projects'),
    pAssistant: () => {
      set({ palette: false })
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: 'assistant' }) })
    },
    pSettings: () => {
      set({ palette: false })
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: 'general' }) })
    },
    pNewChat: () => startChat(activeProjectId),
    pQuiet: () => set({ quiet: true, palette: false }),
    openLogin: () => navigate({ to: '/login' }),
  }
}
