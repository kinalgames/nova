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
import {
  convDefs,
  presetDefs,
  provDefs,
  statusMap,
  suggestionDefs,
  type PresetId,
  type ProviderId,
} from '../data/defs'
import type {
  LumenState,
  PreviewKind,
  StagedFile,
  Theme,
  ThinkLevel,
  ViewName,
} from './types'

const ACCENT_DEFAULT = 'var(--accent)'

const PERSIST_KEY = 'lumen.flow.settings'

interface Persisted {
  theme?: Theme
  advanced?: boolean
  accent?: string
  model?: 'opus' | 'haiku'
  focusDur?: '15' | '25' | '50'
  barOn?: boolean
  thinkingLevel?: ThinkLevel
  activeProvider?: ProviderId
  tools?: LumenState['tools']
  styles?: LumenState['styles']
  projPresets?: Record<PresetId, boolean>
  presetDefault?: Record<PresetId, boolean>
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

function initialState(): LumenState {
  const p = loadPersisted()
  return {
    view: 'conversation',
    advanced: p.advanced ?? false,
    palette: false,
    modelMenu: false,
    capMenu: false,
    projPicker: false,
    inspector: false,
    quiet: false,
    traceOpen: false,
    drawerOpen: false,
    sidebarCollapsed: false,
    accountMenu: false,
    authView: null,
    preview: null,
    respState: 'done',
    freshChat: false,
    convMenu: null,
    chatProject: 'Aurora',
    thinkMenu: false,
    thinkingLevel: p.thinkingLevel ?? 'normal',
    theme: p.theme ?? 'light',
    focusDur: p.focusDur ?? '25',
    styles: p.styles ?? { concise: true, warm: false, formal: false, humor: false },
    model: p.model ?? 'opus',
    tools: p.tools ?? { web: true, fetch: true, files: true, bash: true },
    draft: '',
    q: '',
    sent: [],
    typing: false,
    typingLabel: 'Nova đang suy nghĩ…',
    barOn: p.barOn ?? true,
    copied: false,
    tokenPct: '42%',
    activeProvider: p.activeProvider ?? 'claude',
    projPresets: p.projPresets ?? {
      code: false,
      design: true,
      research: true,
      writing: true,
      data: false,
    },
    presetDefault: p.presetDefault ?? {
      code: false,
      design: false,
      research: true,
      writing: true,
      data: false,
    },
    staged: [
      { id: 'demo-img', kind: 'image', name: 'moodboard.png', size: '820 KB', demo: true },
      { id: 'demo-pdf', kind: 'pdf', name: 'Brief-Aurora.pdf', size: '1.2 MB', demo: true },
    ],
    accent: p.accent ?? ACCENT_DEFAULT,
    showShortcutsBar: true,
    vw: typeof window !== 'undefined' ? window.innerWidth : 1200,
  }
}

type Updater = Partial<LumenState> | ((s: LumenState) => Partial<LumenState>)

export interface Store {
  s: LumenState
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<LumenState>(initialState)
  const [prefersDark, setPrefersDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const t1 = useRef<ReturnType<typeof setTimeout>>(undefined)
  const t2 = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tc = useRef<ReturnType<typeof setTimeout>>(undefined)

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
      tools: s.tools,
      styles: s.styles,
      projPresets: s.projPresets,
      presetDefault: s.presetDefault,
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
    s.tools,
    s.styles,
    s.projPresets,
    s.presetDefault,
  ])

  // resize tracking
  useEffect(() => {
    const onResize = () => set({ vw: window.innerWidth })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [set])

  // prefers-color-scheme tracking (for theme: auto)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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
        set({
          palette: false,
          modelMenu: false,
          capMenu: false,
          projPicker: false,
          quiet: false,
          drawerOpen: false,
          accountMenu: false,
          preview: null,
          thinkMenu: false,
          convMenu: null,
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  // scroll conversation to bottom when a message is appended
  const sentLen = s.sent.length
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [sentLen])

  useEffect(
    () => () => {
      clearTimeout(t1.current)
      clearTimeout(t2.current)
      clearTimeout(tc.current)
    },
    [],
  )

  const go = useCallback(
    (view: ViewName) =>
      set({
        view,
        palette: false,
        modelMenu: false,
        capMenu: false,
        projPicker: false,
        drawerOpen: false,
        accountMenu: false,
        convMenu: null,
        freshChat: false,
      }),
    [set],
  )

  const send = useCallback(() => {
    setS((prev) => {
      const t = (prev.draft || '').trim() || 'Tiếp tục giúp mình phần tiếp theo nhé.'
      clearTimeout(t1.current)
      clearTimeout(t2.current)
      t1.current = setTimeout(
        () => set({ typingLabel: 'Đang chạy tính toán…' }),
        800,
      )
      t2.current = setTimeout(
        () =>
          set((x) => ({
            typing: false,
            tokenPct: '51%',
            sent: [
              ...x.sent,
              {
                who: 'NOVA',
                color: 'var(--accent)',
                text: 'Đã rõ. Mình giữ đúng nhịp ba giai đoạn và đã cập nhật plan.md cho khớp.',
                isNova: true,
              },
            ],
          })),
        1900,
      )
      return {
        ...prev,
        view: 'conversation',
        sent: [
          ...prev.sent,
          { who: 'MINH', color: 'var(--muted)', text: t, isNova: false },
        ],
        draft: '',
        typing: true,
        typingLabel: 'Nova đang suy nghĩ…',
        capMenu: false,
        projPicker: false,
      }
    })
  }, [set])

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
      set((x) => ({ staged: [...x.staged, item], capMenu: false }))
    },
    [set],
  )

  const dark = s.theme === 'dark' || (s.theme === 'auto' && prefersDark)

  const v = useMemo(
    () => deriveValues(s, set, { go, send, copyCode, dark, scrollRef }),
    [s, set, go, send, copyCode, dark],
  )

  const store: Store = useMemo(
    () => ({ s, set, v, scrollRef, addUpload }),
    [s, set, v, addUpload],
  )

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

// ---------------------------------------------------------------------------
// Derived values — a faithful port of the prototype's renderVals()
// ---------------------------------------------------------------------------
function deriveValues(
  s: LumenState,
  set: (u: Updater) => void,
  extra: {
    go: (v: ViewName) => void
    send: () => void
    copyCode: () => void
    dark: boolean
    scrollRef: React.RefObject<HTMLDivElement | null>
  },
) {
  const { go, send, copyCode, dark, scrollRef } = extra
  const accent = s.accent ?? ACCENT_DEFAULT
  const adv = s.advanced
  const isMobile = s.vw < 880
  const isDesktop = !isMobile
  const rs = s.respState

  const tk: (keyof LumenState['tools'])[] = ['web', 'fetch', 'files', 'bash']
  const toolToggle = (k: keyof LumenState['tools']) => () =>
    set((x) => ({ tools: { ...x.tools, [k]: !x.tools[k] } }))
  const chk = (k: keyof LumenState['tools']) => (s.tools[k] ? '✓' : '')
  const rowFg = (k: keyof LumenState['tools']) => (s.tools[k] ? accent : 'var(--text-2)')
  const activeCount = tk.filter((k) => s.tools[k]).length

  const mkPreset = (
    map: Record<PresetId, boolean>,
    tog: (id: PresetId) => void,
  ) =>
    presetDefs.map((p) => {
      const on = !!map[p.id]
      return {
        id: p.id,
        name: p.name,
        glyph: p.glyph,
        color: p.color,
        badgeBg: p.badgeBg,
        help: p.help,
        tools: p.tools.map((t) => ({ t })),
        showTools: adv && p.tools.length > 0,
        toggle: () => tog(p.id),
        trackBg: on ? accent : 'var(--border)',
        knobTx: on ? 'translateX(17px)' : 'translateX(0)',
        border: on ? 'var(--accent-line)' : 'var(--border)',
        bg: on ? 'var(--panel)' : 'var(--panel)',
      }
    })

  const togProj = (id: PresetId) =>
    set((x) => ({ projPresets: { ...x.projPresets, [id]: !x.projPresets[id] } }))
  const togDef = (id: PresetId) =>
    set((x) => ({ presetDefault: { ...x.presetDefault, [id]: !x.presetDefault[id] } }))

  const projActiveNames =
    presetDefs
      .filter((p) => s.projPresets[p.id])
      .map((p) => p.name)
      .join(' · ') || 'cơ bản'

  const providers = provDefs.map((p) => {
    const active = s.activeProvider === p.id
    const st = statusMap[p.status]
    return {
      id: p.id,
      select: () => set({ activeProvider: p.id }),
      name: p.name,
      sub: p.sub,
      glyph: p.glyph,
      badgeBg: p.badgeBg,
      badgeFg: p.badgeFg,
      badge: st.badge,
      statusFg: st.fg,
      statusBg: st.bg,
      rec: p.rec ? '· khuyên dùng' : '',
      border: active ? accent : 'var(--border)',
      bg: active ? 'var(--panel)' : 'var(--panel)',
      radioBd: active ? accent : 'var(--border)',
      radioBg: active ? accent : 'transparent',
      radioDot: active ? 'var(--panel)' : 'transparent',
      showKey: active,
      fieldLabel: p.field === 'key' ? 'API KEY' : 'ĐỊA CHỈ MÁY CHỦ',
      fieldValue: p.fieldValue,
      fieldAction:
        p.field === 'key' ? (p.status === 'add' ? 'Lưu' : 'Đổi') : 'Kiểm tra',
      models: p.models.map((m, i) => ({
        name: m,
        fg: i === 0 ? accent : 'var(--muted)',
        bg: i === 0 ? 'var(--accent-soft)' : 'var(--panel)',
        bd: i === 0 ? 'var(--accent-line)' : 'var(--border)',
      })),
    }
  })
  const activeProviderName =
    (provDefs.find((p) => p.id === s.activeProvider) || ({} as { name?: string }))
      .name || 'Claude'

  // sidebar data
  const sideProjDefs = [
    { id: 'chung', name: 'Chung', dot: 'var(--faint)', count: '31' },
    { id: 'aurora', name: 'Aurora', dot: accent, count: '12' },
  ]
  const activeProj = 'aurora'
  const sideProjects = sideProjDefs.map((p) => ({
    name: p.name,
    dot: p.dot,
    count: p.count,
    bg: p.id === activeProj ? 'var(--accent-soft)' : 'transparent',
    fg: p.id === activeProj ? 'var(--text)' : 'var(--text-2)',
    open: () => go('conversation'),
  }))
  const sideConvs = convDefs.map((c) => ({
    title: c.title,
    dot: c.active ? accent : 'var(--border)',
    bg: c.active ? 'var(--accent-soft)' : 'transparent',
    fg: c.active ? 'var(--text)' : 'var(--text-2)',
    open: () => go('conversation'),
  }))

  const pickProjects = [
    { name: 'Aurora', dot: accent, id: 'Aurora' as const },
    { name: 'Chung (mặc định)', dot: 'var(--faint)', id: 'Chung' as const },
  ].map((p) => ({
    name: p.name,
    dot: p.dot,
    bg: s.chatProject === p.id ? 'var(--accent-soft)' : 'transparent',
    check: s.chatProject === p.id ? '✓' : '',
    pick: () => set({ chatProject: p.id, projPicker: false }),
  }))

  const suggestions = suggestionDefs.map((g) => ({
    ...g,
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
    isHome: s.view === 'home',
    isConv: s.view === 'conversation',
    isProjects: s.view === 'projects',
    isProjectCfg: s.view === 'projectcfg',
    isAssistant: s.view === 'assistant',
    isSettings: s.view === 'settings',
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
    novaBg: s.view === 'assistant' ? 'var(--accent-soft)' : 'transparent',
    novaFg: s.view === 'assistant' ? accent : 'var(--text-2)',
    setBg: s.view === 'settings' ? 'var(--accent-soft)' : 'transparent',
    setFg: s.view === 'settings' ? accent : 'var(--text-2)',
    drawerOpen: s.drawerOpen,
    openDrawer: () => set({ drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false }),
    // top
    headerTitle: s.chatProject === 'Chung' ? 'Chung · Mặc định' : 'Aurora · Ra mắt',
    palette: s.palette,
    modelMenu: s.modelMenu,
    capMenu: s.capMenu,
    projPicker: s.projPicker,
    quiet: s.quiet,
    notQuiet: !s.quiet,
    showMeter: isDesktop,
    meterLabel: adv ? 'ngữ cảnh' : 'bộ nhớ',
    modelLabel: s.model === 'opus' ? 'Thông minh' : 'Nhanh',
    modelAMode: 'Thông minh',
    modelBMode: 'Nhanh',
    modelADesc: adv ? 'Opus 4.8 · claude‑opus‑4 · trả lời sâu' : 'Opus 4.8 · trả lời sâu',
    modelBDesc: adv
      ? 'Haiku 4.8 · claude‑haiku‑4 · phản hồi nhanh'
      : 'Haiku 4.8 · phản hồi nhanh',
    checkA: s.model === 'opus' ? '✓' : '',
    checkB: s.model === 'haiku' ? '✓' : '',
    activeProviderName,
    modelMenuLabel: adv ? 'MÔ HÌNH · ' + activeProviderName : 'CHẾ ĐỘ TRỢ LÝ',
    // conversation states
    respState: rs,
    isStream: rs === 'stream',
    isDone: rs === 'done',
    isError: rs === 'error',
    showTrace: rs === 'done' || rs === 'stream',
    traceIconBg: 'var(--accent-soft)',
    traceIconFg: accent,
    traceSummary:
      rs === 'stream'
        ? adv
          ? 'Đang dùng công cụ…'
          : 'Nova đang tra cứu và tính toán…'
        : adv
          ? 'Đã suy nghĩ và dùng 5 công cụ · 6.4 giây'
          : 'Nova đã tra cứu web và cập nhật tài liệu của bạn',
    traceCaret: s.traceOpen ? 'Ẩn ▴' : adv ? 'Chi tiết ▾' : 'Xem Nova đã làm gì ▾',
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
    // inspector
    inspectorInline: isDesktop && s.inspector && s.view === 'conversation',
    showReopen: !s.inspector && s.view === 'conversation' && isDesktop,
    toggleInspector: () => set((x) => ({ inspector: !x.inspector })),
    // composer
    chatProject: s.chatProject,
    toggleProjPicker: () =>
      set((x) => ({ projPicker: !x.projPicker, capMenu: false, thinkMenu: false })),
    staged: s.staged,
    hasStaged: s.staged.length > 0,
    removeStaged: (id: string) =>
      set((x) => ({ staged: x.staged.filter((f) => f.id !== id) })),
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
    scrollRef,
    // theme: CSS owns the palette; we only signal which sheet we're on
    dark,
    // auth
    isOnboarding: s.authView === 'onboarding',
    isLoginForm: s.authView === 'login' || s.authView === 'signup',
    finishOnboarding: () => set({ authView: null }),
    showAuth: !!s.authView,
    isLogin: s.authView !== 'signup',
    logout: () => set({ authView: 'login', accountMenu: false }),
    doLogin: () =>
      set({ authView: s.authView === 'signup' ? 'onboarding' : null }),
    authTitle: s.authView === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập',
    authSub:
      s.authView === 'signup'
        ? 'Bắt đầu với Lumen trong một phút.'
        : 'Tiếp tục tới không gian làm việc của bạn.',
    authCta: s.authView === 'signup' ? 'Tạo tài khoản' : 'Tiếp tục',
    authToggleText: s.authView === 'signup' ? 'Đã có tài khoản?' : 'Chưa có tài khoản?',
    authToggleLink: s.authView === 'signup' ? 'Đăng nhập' : 'Đăng ký',
    authToggleAct:
      s.authView === 'signup'
        ? () => set({ authView: 'login' })
        : () => set({ authView: 'signup' }),
    // approval
    respApproval: rs === 'approval',
    setApproval: () => set({ respState: 'approval', traceOpen: false }),
    approveTool: () => set({ respState: 'done' }),
    denyTool: () => set({ respState: 'done' }),
    stBgApproval: rs === 'approval' ? 'var(--panel)' : 'transparent',
    stFgApproval: rs === 'approval' ? 'var(--text)' : 'var(--muted)',
    // empty / demo
    isEmptyChat: s.freshChat && s.sent.length === 0,
    hasDemo: !(s.freshChat && s.sent.length === 0),
    // conv menu
    convMenu: s.convMenu,
    openConvMenu: () => set({ convMenu: 'c1' }),
    closeConvMenu: () => set({ convMenu: null }),
    // thinking
    thinkingLevel: s.thinkingLevel,
    thinkLabel:
      ({ off: 'Tắt', low: 'Thấp', normal: 'Vừa', high: 'Cao' } as Record<string, string>)[
        s.thinkingLevel
      ] || 'Vừa',
    showThinkChip: s.thinkingLevel !== 'off',
    thinkMenu: s.thinkMenu,
    toggleThinkMenu: () =>
      set((x) => ({ thinkMenu: !x.thinkMenu, capMenu: false, projPicker: false })),
    thinkChkOff: s.thinkingLevel === 'off' ? '✓' : '',
    thinkChkLow: s.thinkingLevel === 'low' ? '✓' : '',
    thinkChkNormal: s.thinkingLevel === 'normal' ? '✓' : '',
    thinkChkHigh: s.thinkingLevel === 'high' ? '✓' : '',
    setThinkOff: () => set({ thinkingLevel: 'off', thinkMenu: false }),
    setThinkLow: () => set({ thinkingLevel: 'low', thinkMenu: false }),
    setThinkNormal: () => set({ thinkingLevel: 'normal', thinkMenu: false }),
    setThinkHigh: () => set({ thinkingLevel: 'high', thinkMenu: false }),
    // theme controls
    setLight: () => set({ theme: 'light' }),
    setDark: () => set({ theme: 'dark' }),
    setAuto: () => set({ theme: 'auto' }),
    themeLightBd: s.theme === 'light' ? accent : 'var(--border)',
    themeLightBg: s.theme === 'light' ? 'var(--accent-soft)' : 'transparent',
    themeLightFg: s.theme === 'light' ? accent : 'var(--muted)',
    themeDarkBd: s.theme === 'dark' ? accent : 'var(--border)',
    themeDarkBg: s.theme === 'dark' ? 'var(--accent-soft)' : 'transparent',
    themeDarkFg: s.theme === 'dark' ? accent : 'var(--muted)',
    themeAutoBd: s.theme === 'auto' ? accent : 'var(--border)',
    themeAutoBg: s.theme === 'auto' ? 'var(--accent-soft)' : 'transparent',
    themeAutoFg: s.theme === 'auto' ? accent : 'var(--muted)',
    // focus duration
    setF15: () => set({ focusDur: '15' }),
    setF25: () => set({ focusDur: '25' }),
    setF50: () => set({ focusDur: '50' }),
    f15Bd: s.focusDur === '15' ? accent : 'var(--border)',
    f15Bg: s.focusDur === '15' ? 'var(--accent-soft)' : 'transparent',
    f15Fg: s.focusDur === '15' ? accent : 'var(--muted)',
    f25Bd: s.focusDur === '25' ? accent : 'var(--border)',
    f25Bg: s.focusDur === '25' ? 'var(--accent-soft)' : 'transparent',
    f25Fg: s.focusDur === '25' ? accent : 'var(--muted)',
    f50Bd: s.focusDur === '50' ? accent : 'var(--border)',
    f50Bg: s.focusDur === '50' ? 'var(--accent-soft)' : 'transparent',
    f50Fg: s.focusDur === '50' ? accent : 'var(--muted)',
    // styles
    toggleConcise: () => set((x) => ({ styles: { ...x.styles, concise: !x.styles.concise } })),
    toggleWarm: () => set((x) => ({ styles: { ...x.styles, warm: !x.styles.warm } })),
    toggleFormal: () => set((x) => ({ styles: { ...x.styles, formal: !x.styles.formal } })),
    toggleHumor: () => set((x) => ({ styles: { ...x.styles, humor: !x.styles.humor } })),
    stConciseBd: s.styles.concise ? accent : 'var(--border)',
    stConciseBg: s.styles.concise ? 'var(--accent-soft)' : 'transparent',
    stConciseFg: s.styles.concise ? accent : 'var(--muted)',
    stWarmBd: s.styles.warm ? accent : 'var(--border)',
    stWarmBg: s.styles.warm ? 'var(--accent-soft)' : 'transparent',
    stWarmFg: s.styles.warm ? accent : 'var(--muted)',
    stFormalBd: s.styles.formal ? accent : 'var(--border)',
    stFormalBg: s.styles.formal ? 'var(--accent-soft)' : 'transparent',
    stFormalFg: s.styles.formal ? accent : 'var(--muted)',
    stHumorBd: s.styles.humor ? accent : 'var(--border)',
    stHumorBg: s.styles.humor ? 'var(--accent-soft)' : 'transparent',
    stHumorFg: s.styles.humor ? accent : 'var(--muted)',
    // account
    accountMenu: s.accountMenu,
    toggleAccountMenu: () => set((x) => ({ accountMenu: !x.accountMenu })),
    bashLabel: adv ? 'Bash' : 'Chạy lệnh',
    showComposerHint: true,
    // bottom bar
    showBar: s.showShortcutsBar && s.barOn && adv && !s.quiet && isDesktop,
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
    presetsProj: mkPreset(s.projPresets, togProj),
    presetsLib: mkPreset(s.presetDefault, togDef),
    projActiveNames,
    projects: [
      {
        name: 'Aurora · Ra mắt sản phẩm',
        desc: 'Dự án mẫu — đủ tình huống chat, công cụ, lỗi & trạng thái',
        dot: accent,
        threads: '12 luồng',
        when: '2 giờ trước',
        open: () => go('conversation'),
        config: () => go('projectcfg'),
      },
    ],
    // advanced toggle
    advTrackBg: adv ? accent : 'var(--border)',
    advKnobTx: adv ? 'translateX(19px)' : 'translateX(0)',
    advBorder: adv ? 'var(--accent-line)' : 'var(--border)',
    advBg: adv ? 'var(--panel)' : 'var(--panel)',
    toggleAdvanced: () => set((x) => ({ advanced: !x.advanced })),
    barOn: s.barOn,
    toggleBar: () => set((x) => ({ barOn: !x.barOn })),
    draft: s.draft,
    q: s.q,
    sent: s.sent,
    typing: s.typing,
    typingLabel: s.typingLabel,
    activeCount,
    tokenPct: s.tokenPct,
    tokenLabel: adv ? '84k / 200k' : 'còn 58%',
    copyLabel: s.copied ? 'Đã chép' : 'Sao chép',
    copied: s.copied,
    quietClock: '24:13',
    // nav handlers
    goHome: () => go('home'),
    goConv: () => go('conversation'),
    goProjects: () => go('projects'),
    goProjectCfg: () => go('projectcfg'),
    goAssistant: () => go('assistant'),
    goSettings: () => go('settings'),
    togglePalette: () => set((x) => ({ palette: !x.palette, drawerOpen: false })),
    closeMenus: () => set({ palette: false, modelMenu: false }),
    toggleModelMenu: () => set((x) => ({ modelMenu: !x.modelMenu })),
    pickOpus: () => set({ model: 'opus', modelMenu: false }),
    pickHaiku: () => set({ model: 'haiku', modelMenu: false }),
    toggleCapMenu: () =>
      set((x) => ({ capMenu: !x.capMenu, projPicker: false, thinkMenu: false })),
    enterQuiet: () => set({ quiet: true }),
    exitQuiet: () => set({ quiet: false }),
    onDraft: (e: React.ChangeEvent<HTMLInputElement>) => set({ draft: e.target.value }),
    onQ: (e: React.ChangeEvent<HTMLInputElement>) => set({ q: e.target.value }),
    onKey: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        send()
      }
    },
    send,
    copyCode,
    pConvAurora: () => go('conversation'),
    pProjects: () => go('projects'),
    pAssistant: () => go('assistant'),
    pSettings: () => go('settings'),
    pNewChat: () =>
      set({
        view: 'conversation',
        sent: [],
        freshChat: true,
        respState: 'done',
        palette: false,
        modelMenu: false,
        drawerOpen: false,
        accountMenu: false,
      }),
    pQuiet: () => set({ quiet: true, palette: false }),
    // expose auth openers for account menu etc.
    openLogin: () => set({ authView: 'login' }),
  }
}
