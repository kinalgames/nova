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
  findModel,
  findProvider,
  presetDefs,
  profileStatusMap,
  provDefs,
  suggestionDefs,
  type ModelRef,
  type PresetId,
  type ProfileKind,
  type SlotId,
} from '../data/defs'
import type {
  Block,
  Message,
  MsgAttachment,
  NovaState,
  SettingsTab,
  StagedFile,
  ViewName,
} from './types'
import { pickProfile } from './rotation'
import {
  exportFilename,
  exportJson as exportJsonOf,
  exportMarkdown,
  groupConvs,
} from './organize'
import { PERSIST_KEY } from './persist'
import { HAS_API, streamChat } from '../services/llm'
import {
  changePassword as changePasswordApi,
  deleteAccount as deleteAccountApi,
  fetchMe,
  getToken,
  signIn,
  signInSocial,
  signInSocialPopup,
  signOut,
  signUp,
  resendVerification,
  updateMe,
  type SessionUser,
} from '../services/auth'
import { buildSystemPrompt } from '../services/prompt'
import { TOKEN_KEY } from '../services/token'
import { generateTitle } from '../services/title'
import { MAX_FILES, deleteFile, rejectUpload, uploadFile } from '../services/upload'
import { createShare, revokeShare } from '../services/share'
import { humanErrorDetail } from '../services/errors'
import { BUILD_ID, newerBuildAvailable, UPDATE_POLL_MS } from '../services/update'
import {
  addSibling,
  appendChild,
  appendToLeaf,
  emptyThread,
  selectSibling,
  siblingInfo,
  updateMessage,
  visiblePath,
} from './thread'
import { describeUpload, downloadFile, downloadUrl } from '../services/files'
import { fetchFileObjectUrl } from '../services/preview'
import {
  ACCENT_DEFAULT,
  HOME_TRAY,
  abortedUploads,
  fmtTokens,
  initialState,
  pathToView,
  showToast as showToastShared,
  snapshotOfThread,
  stagedKeyOf,
  uid,
  whoLabel,
  type NavState,
  type Updater,
} from './store-helpers'
import { useOllamaActions } from './ollama-actions'
import { useSyncEngine, __resetSync } from './sync-engine'
import { useAccountHydration } from './account-hydration'
import { createCredentialActions } from './credential-actions'
import { createProjectActions } from './project-actions'
import { useConversationDelete } from './conversation-delete'
import { computeUsageMeter, fmtCost } from './usage-meter'

export { HOME_TRAY, __resetSync }

type Navigate = ReturnType<typeof useNavigate>

/** debounce for the assistant-name server PATCH (see setAssistantName) */
let nameSaveTimer: ReturnType<typeof setTimeout> | undefined

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
  /** in-flight REAL provider stream (nova-api) — aborted by stop() */
  const llmAbort = useRef<AbortController | null>(null)
  /** settles the in-flight reply's trace on stop() — an aborted stream fires
   *  no callback, and a trace left “Đang suy nghĩ…” forever is stale data */
  const llmSettle = useRef<(() => void) | null>(null)

  const set = useCallback((u: Updater) => {
    setS((prev) => ({ ...prev, ...(typeof u === 'function' ? u(prev) : u) }))
  }, [])

  const { hydrateSync } = useSyncEngine(s, sRef, set)

  // resize tracking — rAF-throttled so a drag-resize never storms re-renders
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => set({ vw: window.innerWidth }))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [set])

  const { adoptAccount, hydrateAfterLogin } = useAccountHydration(sRef, set)

  const { hydrateOllama, pullOllama } = useOllamaActions(s.profiles.ollama, sRef, set)



  // E1: poll /version.json for a newer deploy — on mount, on focus, and every
  // minute. Skipped under vitest (the check itself is unit-tested in isolation).
  /* v8 ignore start */
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    let stop = false
    const check = async () => {
      if (await newerBuildAvailable(BUILD_ID)) {
        if (!stop) set({ updateReady: true })
      }
    }
    void check()
    const iv = setInterval(() => void check(), UPDATE_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop = true
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [set])
  /* v8 ignore stop */

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
    },
    [],
  )

  const navigate = useNavigate()
  const pathname = useRouterState({ select: (st) => st.location.pathname })
  const goTo = useCallback(
    (to: string, params?: Record<string, string>) => {
      void navigate({ to, params } as Parameters<typeof navigate>[0])
    },
    [navigate],
  )
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
          goTo('/new')
          break
        case 'conversation':
          goTo('/chat/$convId', { convId: navRef.current.activeConv })
          break
        case 'projects':
          goTo('/projects')
          break
        case 'project': {
          const pid =
            sRef.current.conversations.find((c) => c.id === navRef.current.activeConv)
              ?.projectId ?? 'chung'
          goTo('/projects/$projectId', { projectId: pid })
          break
        }
        case 'projectcfg': {
          const pid =
            sRef.current.conversations.find((c) => c.id === navRef.current.activeConv)
              ?.projectId ?? 'chung'
          goTo('/projects/$projectId/config', { projectId: pid })
          break
        }
      }
    },
    [set, navigate],
  )

  /**
   * Stream a fake assistant reply as a child of `parentId` in `conv` — the
   * one engine behind send, edit-and-rerun and regenerate (a regenerated
   * reply shares the same parent, so it lands as a sibling version).
   */
  /** files-block refs of a message — the attachments a turn rides with */
  const attachmentRefsOf = (m: Message): { id: string }[] =>
    m.blocks
      .filter((b) => b.type === 'files')
      .flatMap((b) => (b.type === 'files' ? b.items : []))
      .filter((f) => f.fileId)
      .map((f) => ({ id: f.fileId as string }))

  const streamReply = useCallback(
    (conv: string, parentId: string, prompt: string, promptAttachments?: { id: string }[]) => {
      clearTimeout(t1.current)
      clearTimeout(t2.current)
      clearInterval(tc.current)
      // a fresh reply clears any prior error card
      set({ errorDetail: null, errorRequestId: null, errorAction: null, errorConv: null, respState: 'done' })
      const prev = sRef.current
      const proj = prev.projects.find(
        (p) => p.id === prev.conversations.find((c) => c.id === conv)?.projectId,
      )
      // routing: the active slot names a {provider, model}; rotation picks the
      // auth profile (sticky + ordered fallback) the request bills against —
      // for EVERY provider the proxy speaks (claude/gemini/openai/ollama)
      const ref = prev.slots[prev.activeSlot]
      const modelDef = findModel(ref)
      const liveProfile = HAS_API
        ? pickProfile(
            prev.profiles[ref.providerId] ?? [],
            prev.stickyProfile[ref.providerId],
            prev.autoRotate,
          )
        : null
      if (liveProfile && prev.stickyProfile[ref.providerId] !== liveProfile.id)
        set((x) => ({ stickyProfile: { ...x.stickyProfile, [ref.providerId]: liveProfile.id } }))
      if (liveProfile) {
        const replyId = uid()
        const instructions = proj?.isDefault ? '' : (proj?.description ?? '')
        // history: the visible path up to (and incl.) the prompt message.
        // When send() calls straight in, the freshly-appended user message has
        // not rendered into sRef yet — append the prompt turn explicitly then.
        const path = visiblePath(prev.threads[conv] ?? emptyThread())
        const upto = path.findIndex((m) => m.id === parentId)
        const turns = (upto >= 0 ? path.slice(0, upto + 1) : path)
          .map((m) => {
            const attachments = attachmentRefsOf(m)
            return {
              role: m.role,
              content: m.blocks
                .filter((b) => b.type === 'text')
                .map((b) => (b.type === 'text' ? b.text : ''))
                .join('\n\n')
                .trim(),
              ...(attachments.length ? { attachments } : {}),
            }
          })
          .filter((t) => t.content || t.attachments)
        if (upto < 0)
          turns.push({
            role: 'user',
            content: prompt,
            ...(promptAttachments?.length ? { attachments: promptAttachments } : {}),
          })
        const abort = new AbortController()
        llmAbort.current = abort
        let acc = ''
        // T5/chain-action — a short reply block BEFORE any think/tool activity
        // is the model's own lead-in ("Để mình tra cứu…"); once ≥ 2 think/tool
        // steps follow it, this becomes the chain's summary and the block
        // text after the phase settles is the real answer alone (the lead
        // never repeats in the body). Fewer than 2 steps, or no lead text,
        // falls back to the plain phase summary and simple concatenation.
        let leadText = ''
        // live research — thinking deltas and tool invocations build a trace
        // block ABOVE the reply text; it stays on the message afterwards
        // (collapsed) with the measured phase duration + source count as meta
        let think = ''
        let phaseStart = 0
        let phaseMs = 0
        const liveTools: {
          id: string
          name: string
          query: string
          done: boolean
          ok?: boolean
          summary?: string
          firstTitle?: string
          count: number
        }[] = []
        const sources: { n: number; url: string; title: string }[] = []
        // raw citation spans, offsets into the ONE continuous onDelta stream
        // (leadText immediately followed by acc) — blocksNow() remaps these
        // onto whatever the actual rendered body text turns out to be
        const rawCitations: { start: number; end: number; n?: number; text?: string }[] = []
        const hostOf = (url: string) => {
          try {
            return new URL(url).host.replace(/^www\./, '')
          } catch {
            return url
          }
        }
        const blocksNow = (): Block[] => {
          // a chain needs its own short (≤120 char — a real one-liner, not
          // a paragraph that bled in) lead-in AND at least 2 think/tool steps;
          // a long lead falls back to the generic summary so nothing is ever
          // truncated out of the visible reply — it just isn't chain-summary
          // material
          const stepCount = (think ? 1 : 0) + liveTools.length
          const lead = leadText.trim()
          const LEAD_MAX = 120
          const isChain = stepCount >= 2 && !!lead && lead.length <= LEAD_MAX
          // the done marker only needs the step count — independent of
          // whether there happened to be a usable lead-in
          const doneEligible = stepCount >= 2 && !!phaseMs
          const steps = [
            ...(think ? [{ kind: 'think' as const, text: think }] : []),
            ...liveTools.map((tl) => ({
              kind: 'tool' as const,
              node: tl.done && tl.ok === false ? ('danger' as const) : ('accent' as const),
              title: i18n.t(
                tl.name === 'web_fetch'
                  ? 'chat.toolFetch'
                  : tl.name === 'files'
                    ? 'chat.toolFiles'
                    : 'chat.toolSearch',
              ),
              detail: !tl.done
                ? '…'
                : tl.ok === false
                  ? (tl.summary ?? i18n.t('chat.toolFailed'))
                  : (tl.summary ??
                    (tl.firstTitle
                      ? tl.count > 1
                        ? i18n.t('chat.toolSourcesNamed', { count: tl.count, title: tl.firstTitle })
                        : tl.firstTitle
                      : tl.count
                        ? i18n.t('chat.toolSources', { count: tl.count })
                        : '✓')),
              tool: tl.name,
              toolIcon: (tl.name === 'web_fetch'
                ? 'globe'
                : tl.name === 'files'
                  ? 'file'
                  : 'search') as 'globe' | 'search' | 'file',
              ...(tl.query ? { query: tl.query } : {}),
            })),
            ...(doneEligible
              ? [
                  {
                    kind: 'done' as const,
                    node: 'check' as const,
                    title: i18n.t('chat.traceDone'),
                    detail: `· ${i18n.t('chat.thoughtMeta', { s: Math.max(1, Math.round(phaseMs / 1000)) })}`,
                  },
                ]
              : []),
          ]
          const summary = isChain
            ? lead
            : phaseMs
              ? i18n.t(liveTools.length ? 'chat.searchDone' : 'chat.thoughtDone')
              : i18n.t(liveTools.length ? 'chat.searchStream' : 'chat.thoughtStream')
          const meta = [
            ...(sources.length ? [i18n.t('chat.toolSources', { count: sources.length })] : []),
            ...(phaseMs ? [i18n.t('chat.thoughtMeta', { s: Math.max(1, Math.round(phaseMs / 1000)) })] : []),
          ].join(' · ')
          // rawCitations are offsets into leadText+acc, the raw onDelta stream
          // -- remap onto whatever text actually renders: acc alone (chain,
          // lead becomes the summary above) or trimmed-lead+acc (plain reply).
          // A span that falls entirely inside text the body drops (the
          // chain's lead-in, or whitespace trim() removed) is discarded,
          // never left pointing at the wrong characters.
          const leadTrimStart = leadText.length - leadText.trimStart().length
          const accStartRaw = leadText.length
          // resolve each citation's numbered source into its url/title RIGHT
          // here — the UI layer never has to cross-reference the sources
          // block, it just renders what it's given
          const srcOf = (n: number | undefined) => (n ? sources.find((s) => s.n === n) : undefined)
          const citations = rawCitations.flatMap(({ start, end, n, text }) => {
            const src = srcOf(n)
            const extra = src ? { url: src.url, title: src.title } : {}
            if (isChain) {
              if (end <= accStartRaw) return []
              const s = Math.max(start, accStartRaw) - accStartRaw
              const e = end - accStartRaw
              return s < e ? [{ start: s, end: e, n, text, ...extra }] : []
            }
            if (start >= accStartRaw)
              return [
                {
                  start: lead.length + (start - accStartRaw),
                  end: lead.length + (end - accStartRaw),
                  n,
                  text,
                  ...extra,
                },
              ]
            const leadKeptEnd = leadTrimStart + lead.length
            const s = Math.max(start, leadTrimStart) - leadTrimStart
            const e = Math.min(end, leadKeptEnd) - leadTrimStart
            return s < e ? [{ start: s, end: e, n, text, ...extra }] : []
          })
          return [
            ...(steps.length
              ? [{ type: 'trace' as const, summary, ...(meta ? { meta } : {}), steps }]
              : []),
            {
              type: 'text' as const,
              size: 'lead' as const,
              text: isChain ? acc : lead + acc,
              ...(citations.length ? { citations } : {}),
            },
            ...(sources.length
              ? [
                  {
                    type: 'sources' as const,
                    items: sources.map((src) => ({ n: src.n, label: hostOf(src.url), title: src.title, url: src.url })),
                  },
                ]
              : []),
          ]
        }
        const writeBlocks = (extra: Partial<Message> = {}) =>
          set((x) => ({
            threads: {
              ...x.threads,
              [conv]: updateMessage(x.threads[conv], replyId, { blocks: blocksNow(), ...extra }),
            },
          }))
        // the research phase (thinking + tool calls) ends at the first reply
        // token — or at stop/done, for a reply that never leaves the phase
        const settlePhase = () => {
          // floor 1ms — a same-millisecond phase must still settle to “done”
          if (phaseStart && !phaseMs) phaseMs = Math.max(1, Date.now() - phaseStart)
          for (const tl of liveTools) tl.done = true
        }
        llmSettle.current = () => {
          if (!think && !liveTools.length) return
          settlePhase()
          writeBlocks()
        }
        set((x) => ({
          typing: true,
          typingLabel: i18n.t('chat.thinkingLabel'),
          conversations: x.conversations.map((c) =>
            c.id === conv ? { ...c, updatedAt: Date.now() } : c,
          ),
          threads: {
            ...x.threads,
            [conv]: appendChild(x.threads[conv] ?? emptyThread(), parentId, {
              id: replyId,
              role: 'assistant',
              who: (prev.assistantName.trim() || 'Nova').toUpperCase(),
              blocks: [{ type: 'text', size: 'lead', text: '' }],
            }),
          },
        }))
        void streamChat(
          {
            providerId: ref.providerId,
            model: ref.modelId,
            // the persona is composed HERE — name, style toggles and the
            // user's own instructions become one real system prompt
            system: buildSystemPrompt({
              assistantName: prev.assistantName,
              styles: prev.styles,
              customPrompt: prev.systemPrompt,
              projectInstructions: instructions || undefined,
            }),
            // B5 — the “Suy nghĩ” chip drives the provider's native reasoning
            // control (adaptive/budget thinking · thinkingConfig · effort);
            // only models that CAN reason receive it — others never see the
            // knob, so no provider 4xx on an unsupported parameter
            ...(modelDef.caps.reasoning ? { thinking: prev.thinkingLevel } : {}),
            // D1 — native web tools ride ONLY when the model can run them AND
            // the user switched the tool on; unsupported models never see the
            // flag, so no provider 4xx and no silent no-op
            ...(modelDef.caps.webSearch && prev.tools.web ? { search: true } : {}),
            ...(modelDef.caps.webSearch && prev.tools.fetch ? { fetch: true } : {}),
            // T5 — the files tool needs function calling; gated on toolUse
            ...(modelDef.caps.toolUse && prev.tools.files ? { files: true } : {}),
            messages: turns,
            // server-backed profiles chat by id — the secret stays sealed
            // server-side; transitional local profiles still send inline
            ...(liveProfile.server
              ? { credentialId: liveProfile.id }
              : { profile: { kind: liveProfile.kind, credential: liveProfile.credential } }),
          },
          {
            onThinking: (text) => {
              if (!phaseStart) phaseStart = Date.now()
              think += text
              writeBlocks()
            },
            onToolStart: (id, name) => {
              if (!phaseStart) phaseStart = Date.now()
              liveTools.push({ id, name, query: '', done: false, count: 0 })
              set({ typingLabel: i18n.t('chat.searchingLabel') })
              writeBlocks()
            },
            onToolDelta: (id, text) => {
              const tl = liveTools.find((x) => x.id === id)
              if (!tl) return
              // raw streaming args — keep the human part, cap the length
              tl.query = (tl.query + text).slice(0, 200)
              writeBlocks()
            },
            onToolResult: (id, ok, summary, toolSources) => {
              const tl = liveTools.find((x) => x.id === id)
              if (tl) {
                tl.done = true
                tl.ok = ok
                tl.summary = summary
                tl.count = toolSources?.length ?? 0
                tl.firstTitle = toolSources?.[0]?.title
                // the args finished streaming — show only the query VALUE, not
                // the JSON shell it arrived in
                const q = /"query"\s*:\s*"([^"]*)/.exec(tl.query)
                if (q) tl.query = q[1]
              }
              if (toolSources) sources.push(...toolSources)
              writeBlocks()
            },
            onDelta: (text) => {
              // text before any think/tool activity is the model's lead-in
              // (candidate chain summary); once the phase has started, delta
              // text is the real answer that follows the collapsed trace
              if (!phaseStart) leadText += text
              else acc += text
              settlePhase()
              set({ typingLabel: i18n.t('chat.writingLabel') })
              writeBlocks()
            },
            onCitation: (start, end, n, text) => {
              rawCitations.push({ start, end, n, text })
              writeBlocks()
            },
            onDone: (u) => {
              llmSettle.current = null
              settlePhase()
              set({ typing: false })
              writeBlocks({
                usage: {
                  inputTokens: u.inputTokens,
                  outputTokens: u.outputTokens,
                  modelId: ref.modelId,
                  profileId: liveProfile.id,
                  at: Date.now(),
                },
              })
              // D3 — a completed reply names an unnamed conversation. Fire
              // and forget: failure keeps the muted “Untitled” and the next
              // reply retries; a manual rename racing ahead always wins
              // (the updater re-checks that the title is still null). A conv
              // NOT in sRef yet is one born by this very send — unnamed by
              // definition (state commits lag a synchronous stream).
              const known = sRef.current.conversations.find((k) => k.id === conv)
              if (!known || known.title === null) {
                const replyText = acc
                void generateTitle({
                  providerId: ref.providerId,
                  model: ref.modelId,
                  credential: liveProfile.server
                    ? { credentialId: liveProfile.id }
                    : { profile: { kind: liveProfile.kind, credential: liveProfile.credential } },
                  userText: turns[turns.length - 1]?.content ?? '',
                  replyText,
                }).then((title) => {
                  if (!title) return
                  set((x) => ({
                    conversations: x.conversations.map((k) =>
                      k.id === conv && k.title === null ? { ...k, title } : k,
                    ),
                  }))
                })
              }
            },
            onError: (code, message, status, retryAfterSec, requestId) => {
              llmSettle.current = null
              settlePhase()
              // a rate-limited profile enters its cool-down window — the
              // rotation engine will route the NEXT send to the next profile
              if (status === 429)
                set((x) => ({
                  profiles: {
                    ...x.profiles,
                    [ref.providerId]: (x.profiles[ref.providerId] ?? []).map((f) =>
                      f.id === liveProfile.id
                        ? {
                            ...f,
                            status: 'limited' as const,
                            limitedUntil: Date.now() + (retryAfterSec ?? 60) * 1000,
                          }
                        : f,
                    ),
                  },
                }))
              // surface the SPECIFIC provider error in the chat error card
              // (border-danger, retry) instead of burying it in bubble text
              set({
                typing: false,
                respState: 'error',
                errorDetail: humanErrorDetail(code, message, status),
                errorRequestId: requestId ?? null,
                errorAction: 'retry',
                errorConv: conv,
              })
              if (acc || think || liveTools.length) writeBlocks() // keep any partial answer above the card
            },
          },
          abort.signal,
        )
        return
      }

      // No usable profile: surface a clear, PERSISTENT error card in the chat
      // (not a 2s toast that vanishes) with a button to add a provider —
      // reuses the same danger card as live provider errors.
      const replyId = uid()
      set((x) => ({
        typing: false,
        respState: 'error',
        errorDetail: i18n.t('chat.noProviderBody'),
        errorRequestId: null,
        errorAction: 'providers',
        errorConv: conv,
        threads: {
          ...x.threads,
          [conv]: appendChild(x.threads[conv] ?? emptyThread(), parentId, {
            id: replyId,
            role: 'assistant',
            who: (prev.assistantName.trim() || 'Nova').toUpperCase(),
            blocks: [{ type: 'text', size: 'lead', text: '' }],
          }),
        },
      }))
    },
    [set, navigate],
  )

  // BYOK gate: with NO live profile for the active model, sending would only
  // mint a dead error bubble under the message — the ProviderNudge already on
  // screen IS the notification. Block the mutation, keep the user's draft
  // intact, and pulse the nudge to pull the eye to the one next step.
  const nudgeInstead = useCallback((): boolean => {
    const st = sRef.current
    const providerId = st.slots[st.activeSlot].providerId
    if ((st.profiles[providerId] ?? []).length > 0) return false
    set((x) => ({ nudgeNonce: x.nudgeNonce + 1 }))
    return true
  }, [set])

  const send = useCallback(() => {
    // empty composer is a no-op: never send a message the user didn't write
    const text = sRef.current.draft.trim()
    if (!text) return
    if (nudgeInstead()) return
    // the URL owns the active conversation. Home has no :convId — a message
    // composed there starts a FRESH conversation (in the composer's visible
    // project) rather than silently appending to the last-open thread
    const onHome = navRef.current.view === 'home'
    const srcKey = stagedKeyOf(navRef.current) // Home composes into its own tray bucket
    const convId = onHome ? uid() : navRef.current.activeConv
    const stagedAll = sRef.current.staged[srcKey] ?? []
    // B1 — never send mid-upload (the button is disabled too; this is the
    // keyboard-path guard); failed files stay in the tray, they never ride
    if (stagedAll.some((f) => f.progress !== undefined)) return
    const stagedNow = stagedAll.filter((f) => !f.error)
    const userBlocks: Block[] = [{ type: 'text', text }]
    if (stagedNow.length)
      userBlocks.push({
        type: 'files',
        items: stagedNow.map((f) => ({
          kind: f.kind,
          name: f.name,
          meta: f.size,
          image: f.kind === 'image',
          open: f.kind,
          ...(f.fileId ? { fileId: f.fileId } : {}),
          ...(f.url ? { url: f.url } : {}),
        })),
      })
    const userId = uid()
    set((x) => ({
      draft: '',
      // sending consumes the staged attachments visible in the composer
      staged: { ...x.staged, [srcKey]: [] },
      ...(onHome
        ? {
            conversations: [
              {
                id: convId,
                // D3 — born unnamed: the UI shows a muted “Untitled” until
                // the first completed reply names the conversation
                title: null,
                updatedAt: Date.now(),
                projectId:
                  x.homeProject ??
                  x.conversations.find((c) => c.id === navRef.current.activeConv)
                    ?.projectId ??
                  'chung',
              },
              ...x.conversations,
            ],
            activeConv: convId,
            homeProject: null,
          }
        : {}),
      threads: {
        ...x.threads,
        [convId]: appendToLeaf(x.threads[convId] ?? emptyThread(), {
          id: userId,
          role: 'user',
          who: whoLabel(sRef.current.userName),
          blocks: userBlocks,
        }),
      },
    }))
    streamReply(
      convId,
      userId,
      text,
      stagedNow.filter((f) => f.fileId).map((f) => ({ id: f.fileId as string })),
    )
    goTo('/chat/$convId', { convId })
    // sending always snaps to the bottom (after the append renders)
    setTimeout(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 0)
  }, [set, navigate, streamReply, nudgeInstead])

  // edit a user message: the edit becomes a sibling VERSION (original stays
  // reachable via ‹ ›), keeps the original attachments, and re-runs the reply
  const editMessage = useCallback(
    (messageId: string, text: string) => {
      const conv = navRef.current.activeConv
      const th = sRef.current.threads[conv]
      const orig = th?.byId[messageId]
      if (!th || !orig || orig.role !== 'user' || !text.trim()) return
      // an edit that changes NOTHING is not a new version — branching happens
      // only when the message really changed (or on explicit regenerate)
      const origText = orig.blocks.find((b) => b.type === 'text')
      if (origText?.type === 'text' && origText.text.trim() === text.trim()) {
        set({ editingMsg: null })
        return
      }
      if (nudgeInstead()) return
      const keep = orig.blocks.filter((b) => b.type === 'files')
      const newId = uid()
      set((x) => ({
        editingMsg: null,
        threads: {
          ...x.threads,
          [conv]: addSibling(x.threads[conv], messageId, {
            id: newId,
            role: 'user',
            who: orig.who,
            blocks: [{ type: 'text', text: text.trim() }, ...keep],
          }),
        },
      }))
      streamReply(conv, newId, text.trim())
    },
    [set, streamReply, nudgeInstead],
  )

  // regenerate an assistant reply as a sibling version under the same prompt
  const regenerate = useCallback(
    (replyId: string) => {
      const conv = navRef.current.activeConv
      const th = sRef.current.threads[conv]
      const reply = th?.byId[replyId]
      if (!th || !reply || reply.role !== 'assistant' || !reply.parentId) return
      if (nudgeInstead()) return
      const parent = th.byId[reply.parentId]
      const promptBlock = parent?.blocks.find((b) => b.type === 'text')
      const prompt = promptBlock && promptBlock.type === 'text' ? promptBlock.text : ''
      streamReply(conv, reply.parentId, prompt)
    },
    [streamReply, nudgeInstead],
  )

  const selectVersion = useCallback(
    (messageId: string, delta: number) => {
      const conv = navRef.current.activeConv
      set((x) =>
        x.threads[conv]
          ? { threads: { ...x.threads, [conv]: selectSibling(x.threads[conv], messageId, delta) } }
          : {},
      )
    },
    [set],
  )

  const copyMessage = useCallback(
    (messageId: string) => {
      const conv = navRef.current.activeConv
      const msg = sRef.current.threads[conv]?.byId[messageId]
      if (!msg) return
      const text = msg.blocks
        .filter((b) => b.type === 'text')
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('\n\n')
      try {
        void navigator.clipboard?.writeText(text)
      } catch {
        /* ignore */
      }
      set({ copiedMsg: messageId })
      clearTimeout(t2.current)
      t2.current = setTimeout(() => set({ copiedMsg: null }), 1400)
    },
    [set],
  )

  const setFeedback = useCallback(
    (messageId: string, val: 'up' | 'down') => {
      const conv = navRef.current.activeConv
      set((x) => {
        const th = x.threads[conv]
        const msg = th?.byId[messageId]
        if (!th || !msg) return {}
        return {
          threads: {
            ...x.threads,
            [conv]: updateMessage(th, messageId, {
              feedback: msg.feedback === val ? undefined : val,
            }),
          },
        }
      })
    },
    [set],
  )

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
    llmAbort.current?.abort()
    llmAbort.current = null
    // an aborted stream fires no callback — settle the trace so it never
    // stays “Đang suy nghĩ…” on a reply that already stopped
    llmSettle.current?.()
    llmSettle.current = null
    set({ typing: false })
  }, [set])

  const addUpload = useCallback(
    (file: File) => {
      const { kind, size, url } = describeUpload(file)
      const key = stagedKeyOf(navRef.current)
      if ((sRef.current.staged[key] ?? []).length >= MAX_FILES) {
        set({ toast: i18n.t('upload.max') })
        return
      }
      const live = HAS_API && !!getToken()
      // instant validation — an impossible file becomes a danger pill with a
      // reason, no network call ever fires
      const reason = live ? rejectUpload(file) : null
      const item: StagedFile = {
        id: uid(),
        kind,
        name: file.name,
        size,
        url,
        ...(reason ? { error: i18n.t(reason) } : live ? { progress: 0 } : {}),
      }
      const key2 = key
      set((x) => ({
        staged: { ...x.staged, [key2]: [...(x.staged[key2] ?? []), item] },
      }))
      if (!live || reason) return
      const patchItem = (patch: Partial<StagedFile>) =>
        set((x) => ({
          staged: {
            ...x.staged,
            [key2]: (x.staged[key2] ?? []).map((f) => (f.id === item.id ? { ...f, ...patch } : f)),
          },
        }))
      void uploadFile(file, (pct) => patchItem({ progress: pct })).then((up) => {
        // the pill may have been removed (or its conversation deleted) while
        // the bytes were in flight — the fresh upload is garbage: delete it
        if (abortedUploads.delete(item.id)) {
          if (up) void deleteFile(up.id)
          return
        }
        if (up) patchItem({ fileId: up.id, progress: undefined })
        else patchItem({ progress: undefined, error: i18n.t('upload.failed') })
      })
    },
    [set],
  )

  const { delConv, undoDelete } = useConversationDelete(sRef, navRef, set, goTo)

  // prefers-color-scheme tracking (for theme: auto)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = s.theme === 'dark' || (s.theme === 'auto' && prefersDark)

  // Dark mode is a class over runtime tokens. It MUST live on <html>, not on
  // the app-root div: Radix Dialog/Dropdown/HoverCard render through a Portal
  // mounted on document.body — OUTSIDE the app root — so a root-scoped .dark
  // never reaches them and every popover renders light-on-dark (active/hover
  // states look wrong or unchanged). On <html> the tokens cascade everywhere.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // subscribing here re-renders the provider (and recomputes the VM strings)
  // when the language changes
  const { t } = useTranslation()

  const v = useMemo(
    () =>
      deriveValues(s, set, {
        go,
        goTo,
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
        editMessage,
        regenerate,
        selectVersion,
        copyMessage,
        setFeedback,
        adoptAccount,
        ollamaRefresh: hydrateOllama,
        ollamaPullStart: pullOllama,
        hydrateSync,
        hydrateAfterLogin,
      }),
    [s, set, go, goTo, send, stop, copyCode, dark, delConv, undoDelete, nav, navigate, t, editMessage, regenerate, selectVersion, copyMessage, setFeedback, adoptAccount, hydrateOllama, pullOllama, hydrateSync, hydrateAfterLogin],
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
    goTo: (to: string, params?: Record<string, string>) => void
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
    editMessage: (id: string, text: string) => void
    regenerate: (id: string) => void
    selectVersion: (id: string, delta: number) => void
    copyMessage: (id: string) => void
    setFeedback: (id: string, val: 'up' | 'down') => void
    adoptAccount: (me: SessionUser) => void
    ollamaRefresh: () => Promise<void>
    ollamaPullStart: (model: string) => void
    hydrateSync: () => () => void
    hydrateAfterLogin: () => void
  },
) {
  const {
    go,
    goTo,
    ollamaRefresh,
    ollamaPullStart,
    hydrateSync,
    hydrateAfterLogin,
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
    editMessage,
    regenerate,
    selectVersion,
    copyMessage,
    setFeedback,
    adoptAccount,
  } = extra
  const activeConv = nav.activeConv
  const activeConvObj = s.conversations.find((c) => c.id === activeConv)
  // on Home the explicitly chosen new-chat project wins; elsewhere the active
  // conversation owns the project context
  const activeProjectId =
    nav.view === 'home' && s.homeProject !== null
      ? s.homeProject
      : (activeConvObj?.projectId ?? 'chung')
  const activeProject = s.projects.find((p) => p.id === activeProjectId) ?? s.projects[0]
  const convCount = (pid: string) => s.conversations.filter((c) => c.projectId === pid).length
  // the project addressed by the URL (project view / config routes)
  const viewProject = s.projects.find((p) => p.id === nav.projectId) ?? activeProject
  // where the user currently *is*: the viewed project on /projects routes,
  // otherwise the active conversation's project. Drives the sidebar scope and
  // which project/conversation reads as active.
  const currentProjectId = viewProject?.id ?? 'chung'
  const currentProjectName = viewProject?.name ?? t('projects.defaultName')

  // ----- project CRUD (fake store — no backend) -----
  const {
    createProject,
    editProject,
    addProjectFile,
    removeProjectFile,
    deleteProject,
    moveConv,
    toggleProjectPreset,
    startChat,
  } = createProjectActions(set, goTo)

  const sortConvs = (list: NovaState['conversations']) =>
    [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const showToast = (msg: string) => showToastShared(set, msg)
  const mapConv = (c: NovaState['conversations'][number]) => {
    // bg-highlight only when this conversation is the one actually open; the
    // busy pulse follows the generating conversation across any route
    const isActive = nav.view === 'conversation' && c.id === activeConv
    return {
      id: c.id,
      title: c.title ?? t('nav.untitled'),
      untitled: c.title === null,
      active: isActive,
      pinned: !!c.pinned,
      archived: !!c.archived,
      archive: () =>
        set((x) => ({
          conversations: x.conversations.map((k) =>
            k.id === c.id ? { ...k, archived: !k.archived } : k,
          ),
        })),
      exportMd: () =>
        downloadFile(
          exportFilename(c.title ?? '', 'md'),
          exportMarkdown(c, s.threads[c.id]),
          'text/markdown',
        ),
      exportJson: () =>
        downloadFile(
          exportFilename(c.title ?? '', 'json'),
          exportJsonOf(c, s.threads[c.id]),
          'application/json',
        ),
      // BE4 — create (or re-copy) the real unlisted share link; without an
      // world keeps its showcase copy behaviour
      share: () => {
        void (async () => {
          if (!HAS_API) {
            try {
              await navigator.clipboard?.writeText(`https://nova.app/share/${c.id}`)
            } catch {
              /* clipboard unavailable — the toast still confirms the intent */
            }
            showToast(t('share.copied'))
            return
          }
          let sid = c.shareId
          if (!sid) {
            const messages = snapshotOfThread(s.threads[c.id])
            if (messages.length === 0) {
              showToast(t('share.empty'))
              return
            }
            const created = await createShare(c.id, c.title ?? 'Untitled', messages)
            if (!created) {
              showToast(t('share.failed'))
              return
            }
            sid = created
            set((x) => ({
              conversations: x.conversations.map((k) =>
                k.id === c.id ? { ...k, shareId: created } : k,
              ),
            }))
          }
          try {
            await navigator.clipboard?.writeText(`${window.location.origin}/share/${sid}`)
          } catch {
            /* clipboard unavailable — the toast still confirms the intent */
          }
          showToast(t('share.copied'))
        })()
      },
      shared: !!c.shareId,
      unshare: () => {
        void (async () => {
          if (!c.shareId) return
          if (!(await revokeShare(c.shareId))) {
            showToast(t('share.revokeFailed'))
            return
          }
          set((x) => ({
            conversations: x.conversations.map((k) =>
              k.id === c.id ? { ...k, shareId: undefined } : k,
            ),
          }))
          showToast(t('share.revoked'))
        })()
      },
      busy: c.id === activeConv && s.typing,
      deleting: s.deleting.includes(c.id),
      // the open conversation reads through text color AND a permanent soft
      // wash (the SAME token the transient hover uses) — text-only wasn't
      // legible enough to spot the active row at a glance
      bg: isActive ? 'var(--hover-1)' : 'transparent',
      // an unnamed conversation renders muted — the name simply isn't there yet
      fg: isActive ? 'var(--accent-text)' : c.title === null ? 'var(--muted)' : 'var(--text-2)',
      onSelect: () => set({ activeConv: c.id, palette: false, drawerOpen: false }),
      open: () => {
        set({ activeConv: c.id, palette: false, drawerOpen: false })
        goTo('/chat/$convId', { convId: c.id })
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
  const activeThreadTree = s.threads[activeConv]
  const activeThread = activeThreadTree ? visiblePath(activeThreadTree) : []
  // version position for every visible message (only forks show ‹ i/n ›)
  const versions: Record<string, { index: number; count: number }> = {}
  if (activeThreadTree)
    for (const msg of activeThread) versions[msg.id] = siblingInfo(activeThreadTree, msg.id)
  const activeStaged = s.staged[stagedKeyOf(nav)] ?? []

  const {
    costOf,
    usageIn,
    usageOut,
    usageCost,
    usedPct,
    profileTotals,
    monthIn,
    monthOut,
    monthCost,
    serverMonth,
  } = computeUsageMeter(s, activeThread)


  const tk: (keyof NovaState['tools'])[] = ['web', 'fetch', 'files', 'bash']
  const toolToggle = (k: keyof NovaState['tools']) => () =>
    set((x) => ({ tools: { ...x.tools, [k]: !x.tools[k] } }))
  const chk = (k: keyof NovaState['tools']) => (s.tools[k] ? '✓' : '')
  // D1 — web tools follow the active model's capability: on an unsupported
  // model the rows render faint and inert instead of silently no-oping
  const activeModelCaps = findModel(s.slots[s.activeSlot]).caps
  const webCapable = !!activeModelCaps.webSearch
  const filesCapable = !!activeModelCaps.toolUse
  const rowCapable = (k: keyof NovaState['tools']) =>
    k === 'web' || k === 'fetch' ? webCapable : k === 'files' ? filesCapable : false
  const rowFg = (k: keyof NovaState['tools']) =>
    !rowCapable(k) ? 'var(--faint)' : s.tools[k] ? accentText : 'var(--text-2)'
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

  // — auth profiles: ordered by rotation priority within each provider —
  const setSlot = (slot: SlotId, refM: ModelRef) =>
    set((x) => ({ slots: { ...x.slots, [slot]: refM } }))
  const { addProfile, removeProfile, moveProfile, testProfile } = createCredentialActions(s, set, t)
  const providers = provDefs.map((p) => {
    const profs = s.profiles[p.id] ?? []
    const current = pickProfile(profs, s.stickyProfile[p.id], s.autoRotate)
    const agg = profs.some((f) => f.status === 'active')
      ? ('active' as const)
      : profs.some((f) => f.status === 'limited')
        ? ('limited' as const)
        : profs.some((f) => f.status === 'error')
          ? ('error' as const)
          : profs.length
            ? ('untested' as const)
            : null
    const aggColors = agg ? profileStatusMap[agg] : { fg: 'var(--warn-text)', bg: 'var(--warn-bg)' }
    return {
      id: p.id,
      name: p.id === 'ollama' ? t('vocab.providers.ollama.name') : p.name,
      sub: t(`vocab.providers.${p.id}.sub`),
      glyph: p.glyph,
      badgeBg: p.badgeBg,
      badgeFg: p.badgeFg,
      rec: p.rec ? t('vocab.recommended') : '',
      badge: agg ? t(`vocab.profileStatus.${agg}`) : t('vocab.profileStatus.none'),
      statusFg: aggColors.fg,
      statusBg: aggColors.bg,
      fieldLabel: p.field === 'key' ? t('settings.apiKey') : t('settings.endpoint'),
      placeholder: p.placeholder,
      // 'account' kind is Claude-only (Claude Code setup-token) — Gemini's
      // OAuth "account" path was removed (see docs/session-handoff.md), so
      // no other provider reaches the account branch below.
      kinds: p.auth.map((k) => ({
        kind: k,
        label: t(k === 'account' ? 'settings.kindAccount' : 'settings.kindApiKey'),
        // progressive-disclosure CTA + per-provider guidance (only rendered
        // once the user picks this path)
        cta:
          k === 'account'
            ? t('settings.ctaAccount')
            : p.field === 'endpoint'
              ? t('settings.ctaEndpoint')
              : t('settings.ctaApiKey'),
        help: k === 'account' ? t('settings.accountHelpClaude') : '',
        placeholder: k === 'account' ? 'sk-ant-oat01-…' : p.placeholder,
      })),
      profiles: profs.map((f, i) => ({
        id: f.id,
        name: f.name,
        kindLabel: t(f.kind === 'account' ? 'settings.kindAccount' : 'settings.kindApiKey'),
        // account-kind hint is a meaningless token-tail fragment (name
        // already carries the real signal — signed-in email or a chosen
        // label) — api_key hint stays: it lets the user verify the right key
        isAccount: f.kind === 'account',
        credential: f.credential,
        badge: t(`vocab.profileStatus.${f.status}`),
        statusFg: profileStatusMap[f.status].fg,
        statusBg: profileStatusMap[f.status].bg,
        inUse: current?.id === f.id,
        usage: profileTotals[f.id]
          ? `${fmtTokens(profileTotals[f.id].inTok)}↑ ${fmtTokens(profileTotals[f.id].outTok)}↓ · ${
              profileTotals[f.id].cost === 0 ? t('meter.costFree') : fmtCost(profileTotals[f.id].cost)
            }`
          : '',
        testing: s.testingProfile === f.id,
        // the last failed test's reason — rendered under this row
        error: s.testDetail?.id === f.id ? s.testDetail.msg : '',
        test: () => testProfile(p.id, f.id),
        remove: () => removeProfile(p.id, f.id),
        moveUp: () => moveProfile(p.id, f.id, -1),
        moveDown: () => moveProfile(p.id, f.id, 1),
        canUp: i > 0,
        canDown: i < profs.length - 1,
      })),
      addProfile: (kind: ProfileKind, name: string, credential: string) =>
        addProfile(p.id, kind, name, credential),
      // accordion — one provider's config expands at a time
      open: s.openProvider === p.id,
      toggle: () =>
        set((x) => ({ openProvider: x.openProvider === p.id ? null : p.id })),
      summary: t('settings.profileCount', { count: profs.length }),
    }
  })

  // Tợ lý → MODEL pickers: every catalog model of the slot's mode across ALL
  // providers; ollama's dynamic models list in BOTH slots (the user knows
  // their local models' strength). Disconnected providers stay visible but
  // dimmed with a connect CTA — discovery beats hiding.
  const fmtCtx = (n: number) =>
    n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
  const slotChoices = (slot: SlotId) =>
    provDefs
      .flatMap((p) => {
        const connected = (s.profiles[p.id] ?? []).length > 0
        const models =
          p.id === 'ollama' ? s.ollamaModels : p.models.filter((m) => m.mode === slot)
        return models.map((m) => ({
          key: `${p.id}:${m.id}`,
          providerId: p.id,
          providerName: p.id === 'ollama' ? t('vocab.providers.ollama.name') : p.name,
          badgeBg: p.badgeBg,
          badgeFg: p.badgeFg,
          name: m.name,
          caps: m.caps,
          meta: [
            m.ctx ? t('model.ctx', { ctx: fmtCtx(m.ctx) }) : '',
            m.inPrice === 0 ? t('settings.priceFree') : `$${m.inPrice}/$${m.outPrice}`,
          ]
            .filter(Boolean)
            .join(' · '),
          legacy: m.legacy ? t('model.legacy') : '',
          connected,
          active: s.slots[slot].providerId === p.id && s.slots[slot].modelId === m.id,
          pick: () => setSlot(slot, { providerId: p.id, modelId: m.id }),
          // CTA for a disconnected provider — jump to its expanded config
          connect: () => {
            set({ openProvider: p.id, palette: false, drawerOpen: false })
            navigate({ to: '.', search: (prev) => ({ ...prev, settings: 'providers' }) })
          },
        }))
      })
      .sort((a, b) => Number(!!a.legacy) - Number(!!b.legacy))
  // sidebar data
  const sideProjects = s.projects.map((p) => ({
    id: p.id,
    name: p.name,
    dot: p.accent,
    count: String(convCount(p.id)),
    current: p.id === currentProjectId,
    bg: 'transparent',
    fg: p.id === currentProjectId ? 'var(--accent-text)' : 'var(--text-2)',
  }))
  const sideList = sortConvs(
    s.conversations.filter((c) => c.projectId === currentProjectId && !c.archived),
  )
  const sideConvs = sideList.map(mapConv)
  // a real-product fresh boot has no conversations yet — the sidebar invites
  const sidebarEmpty = s.conversations.filter((c) => !c.archived).length === 0
  // date-grouped recents: pinned · hôm nay · hôm qua · tuần này · cũ hơn
  const sideGroups = groupConvs(sideList).map((g) => ({
    id: g.id,
    label: t(`sidebar.group.${g.id}`),
    convs: g.items.map(mapConv),
  }))
  const archivedConvs = s.conversations
    .filter((c) => c.projectId === currentProjectId && c.archived)
    .map(mapConv)

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


  return {
    webCheck: chk('web'),
    fetchCheck: chk('fetch'),
    filesCheck: chk('files'),
    bashCheck: chk('bash'),
    webRowFg: rowFg('web'),
    fetchRowFg: rowFg('fetch'),
    filesRowFg: rowFg('files'),
    bashRowFg: rowFg('bash'),
    toggle_web: webCapable ? toolToggle('web') : () => {},
    toggle_fetch: webCapable ? toolToggle('fetch') : () => {},
    toggle_files: filesCapable ? toolToggle('files') : () => {},
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
    sideGroups,
    archivedConvs,
    archivedOpen: s.archivedOpen,
    toggleArchived: () => set((x) => ({ archivedOpen: !x.archivedOpen })),
    toast: s.toast,
    sidebarEmpty,
    pickProjects,
    setBg: nav.settingsOpen ? 'var(--accent-soft)' : 'transparent',
    setFg: nav.settingsOpen ? accentText : 'var(--text-2)',
    settingsOpen: nav.settingsOpen,
    settingsTab: nav.settingsTab,
    // BYOK nudge — the ACTIVE model's provider has no live profile: chat
    // surfaces “connect a provider” instead of a silent empty screen
    needsProvider:
      (s.profiles[s.slots[s.activeSlot].providerId] ?? []).length === 0,
    nudgeNonce: s.nudgeNonce,
    nudgeLogin: !s.accountId,
    nudgeGo: () => {
      if (!s.accountId) {
        navigate({ to: '/login' })
        return
      }
      set({ palette: false, drawerOpen: false })
      navigate({ to: '.', search: (prev) => ({ ...prev, settings: 'providers' }) })
    },
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
    headerTitle: (() => {
      const open = s.conversations.find((c) => c.id === activeConv)
      return open ? (open.title ?? t('nav.untitled')) : t('chat.headerFallback')
    })(),
    headerUntitled:
      s.conversations.find((c) => c.id === activeConv)?.title === null,
    palette: s.palette,
    quiet: s.quiet,
    notQuiet: !s.quiet,
    showMeter: isDesktop,
    meterLabel: t('meter.label'),
    modelLabel: s.activeSlot === 'smart' ? t('model.smart') : t('model.fast'),
    modelAMode: t('model.smart'),
    modelBMode: t('model.fast'),
    modelADesc: t('model.smartDesc'),
    modelBDesc: t('model.fastDesc'),
    // each slot renders as [provider icon][model name] — cross-provider routing
    modelAName: findModel(s.slots.smart).name,
    modelBName: findModel(s.slots.fast).name,
    modelAGlyph: findProvider(s.slots.smart.providerId).glyph,
    modelBGlyph: findProvider(s.slots.fast.providerId).glyph,
    modelAProviderId: s.slots.smart.providerId,
    modelBProviderId: s.slots.fast.providerId,
    modelABadgeBg: findProvider(s.slots.smart.providerId).badgeBg,
    modelABadgeFg: findProvider(s.slots.smart.providerId).badgeFg,
    modelBBadgeBg: findProvider(s.slots.fast.providerId).badgeBg,
    modelBBadgeFg: findProvider(s.slots.fast.providerId).badgeFg,
    checkA: s.activeSlot === 'smart' ? '✓' : '',
    checkB: s.activeSlot === 'fast' ? '✓' : '',
    modelMenuLabel: t('model.menuLabel'),
    autoRotate: s.autoRotate,
    toggleAutoRotate: () => set((x) => ({ autoRotate: !x.autoRotate })),
    // current-month usage roll-up for Settings → Providers — server-side
    // totals (cross-device) when hydrated, the local roll-up otherwise
    monthUsage: serverMonth
      ? `${fmtTokens(serverMonth.inTok)}↑ ${fmtTokens(serverMonth.outTok)}↓ · ${
          serverMonth.cost === 0 ? t('meter.costFree') : fmtCost(serverMonth.cost)
        }`
      : monthIn + monthOut > 0
        ? `${fmtTokens(monthIn)}↑ ${fmtTokens(monthOut)}↓ · ${
            monthCost === 0 ? t('meter.costFree') : fmtCost(monthCost)
          }`
        : '',
    // D — profile, data controls, cheatsheet
    stylesState: s.styles,
    userName: s.userName,
    userEmail: s.userEmail ?? '',
    userFirstName: s.userName.trim().split(/\s+/)[0] || s.userName,
    setUserName: (name: string) => set({ userName: name }),
    assistantName: s.assistantName,
    setAssistantName: (name: string) => {
      set({ assistantName: name })
      // keep the server column in step (it feeds /v1/me and the onboarding
      // marker) — debounced so typing doesn't storm PATCH requests
      if (!HAS_API || !getToken()) return
      clearTimeout(nameSaveTimer)
      nameSaveTimer = setTimeout(() => void updateMe({ assistantName: name.trim() || 'Nova' }), 800)
    },
    systemPrompt: s.systemPrompt,
    setSystemPrompt: (text: string) => set({ systemPrompt: text }),
    exportAllData: () =>
      downloadFile('nova-data.json', localStorage.getItem(PERSIST_KEY) ?? '{}', 'application/json'),
    /* v8 ignore next 4 — hard navigation, not reachable from the unit env */
    clearAllData: () => {
      localStorage.removeItem(PERSIST_KEY)
      window.location.reload()
    },
    cheatsheet: s.cheatsheet,
    openCheatsheet: () => set({ cheatsheet: true }),
    closeCheatsheet: () => set({ cheatsheet: false }),
    // E1 — update toast
    updateReady: s.updateReady,
    dismissUpdate: () => set({ updateReady: false }),
    /* v8 ignore next — hard navigation, not reachable from the unit env */
    reloadNow: () => window.location.reload(),
    // per-reply usage meta, advanced mode only: "1.2k↑ 3.4k↓ · ~$0.09"
    msgUsage: (m: Message): string | null => {
      const u = m.usage
      if (!u || !adv) return null
      const c = costOf(u)
      return `${fmtTokens(u.inputTokens)}↑ ${fmtTokens(u.outputTokens)}↓${c > 0 ? ` · ~${fmtCost(c)}` : ''}`
    },
    // conversation states
    respState: rs,
    isStream: rs === 'stream',
    isDone: rs === 'done',
    isError: rs === 'error',
    // the card shows only in the conversation the error belongs to
    errorHere: rs === 'error' && s.errorConv === activeConv,
    errorDetail: s.errorDetail,
    errorRequestId: s.errorRequestId,
    errorAction: s.errorAction,
    toggleTrace: () => set((x) => ({ traceOpen: !x.traceOpen })),
    traceOpen: s.traceOpen,
    // composer
    chatProject: activeProject?.name ?? t('projects.defaultName'),
    staged: activeStaged,
    hasStaged: activeStaged.length > 0,
    // B1 — sending waits for in-flight uploads (send() re-checks as well)
    uploading: activeStaged.some((f) => f.progress !== undefined),
    removeStaged: (id: string) =>
      set((x) => {
        const key = stagedKeyOf(nav)
        // a removed tray item leaves NOTHING behind: revoke its object URL,
        // delete an already-uploaded file server-side (it belongs to no
        // message — there would be no other path to it ever again), and mark
        // an in-flight upload so it deletes itself when it lands
        const item = (x.staged[key] ?? []).find((f) => f.id === id)
        if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url)
        if (item?.fileId && HAS_API) void deleteFile(item.fileId)
        if (item && item.progress !== undefined) abortedUploads.add(item.id)
        return {
          staged: {
            ...x.staged,
            [key]: (x.staged[key] ?? []).filter((f) => f.id !== id),
          },
        }
      }),
    openStaged: (f: StagedFile) =>
      set({ preview: { kind: f.kind, name: f.name, url: f.url, ...(f.fileId ? { fileId: f.fileId } : {}) } }),
    // real message attachment — carries fileId so Preview fetches the actual
    // bytes/text; a local url (staged blob) is used directly when present
    previewFile: (f: MsgAttachment) =>
      set({
        preview: {
          kind: f.open ?? f.kind,
          name: f.name,
          ...(f.url ? { url: f.url } : {}),
          ...(f.fileId ? { fileId: f.fileId } : {}),
          ...(f.meta ? { meta: f.meta } : {}),
        },
      }),
    preview: s.preview,
    hasPreview: !!s.preview,
    previewName: s.preview?.name || '',
    previewUrl: s.preview?.url,
    previewFileId: s.preview?.fileId,
    isPrevImage: s.preview?.kind === 'image',
    isPrevPdf: s.preview?.kind === 'pdf',
    isPrevCode: s.preview?.kind === 'code',
    isPrevCsv: s.preview?.kind === 'csv',
    isPrevMd: s.preview?.kind === 'md',
    previewMeta: s.preview?.meta ?? '',
    closePreview: () => set({ preview: null }),
    // download / open ship the bytes the app actually has — the server copy
    // (fileId) or the local object URL — never generated stand-in content
    downloadPreview: () => {
      const p = s.preview
      if (!p) return
      if (p.fileId)
        void fetchFileObjectUrl(p.fileId).then((u) => {
          if (!u) return
          downloadUrl(p.name, u)
          setTimeout(() => URL.revokeObjectURL(u), 0)
        })
      else if (p.url) downloadUrl(p.name, p.url)
    },
    openPreviewExternal: () => {
      const p = s.preview
      if (!p) return
      if (p.fileId)
        void fetchFileObjectUrl(p.fileId).then((u) => {
          if (u) window.open(u, '_blank', 'noopener')
        })
      else if (p.url) window.open(p.url, '_blank', 'noopener')
    },
    scrollRef,
    // theme: CSS owns the palette; we only signal which sheet we're on
    dark,
    themeClass: dark ? 'dark' : '',
    // auth
    isOnboarding: nav.authView === 'onboarding',
    isLoginForm: nav.authView === 'login' || nav.authView === 'signup',
    finishOnboarding: () => navigate({ to: '/' }),
    // onboarding choices persist for real — name, reply style, default slot
    completeOnboarding: (opts: {
      assistantName: string
      styles: NovaState['styles']
      slot: SlotId
    }) => {
      const assistantName = opts.assistantName.trim() || 'Nova'
      set({ assistantName, styles: opts.styles, activeSlot: opts.slot })
      // the server column is the durable onboarding marker — social logins
      // route through /onboarding until it is set (fire-and-forget: the
      // op-log sync still carries the name for every device either way)
      if (HAS_API && getToken()) void updateMe({ assistantName })
      navigate({ to: '/' })
    },
    showAuth: nav.authView !== null,
    loggedIn: nav.authView === null,
    isLogin: nav.authView !== 'signup',
    // D4 — account security & deletion
    hasPassword: s.hasPassword ?? false,
    accountDeletable: HAS_API && !!s.userEmail,
    // D5 — soft email-verification nudge: shown while signed in and unverified
    needsVerify: nav.authView === null && !!s.accountId && s.emailVerified === false,
    emailVerified: s.emailVerified === true,
    resendVerify: async (): Promise<void> => {
      const err = await resendVerification(s.userEmail ?? '')
      showToast(err ?? t('chat.verifySent'))
    },
    changePassword: async (current: string, next: string): Promise<string | null> => {
      const err = await changePasswordApi(current, next)
      if (!err) showToast(t('account.pwChanged'))
      return err
    },
    deleteAccount: async (): Promise<boolean> => {
      if (!HAS_API) return false
      const ok = await deleteAccountApi()
      if (!ok) {
        showToast(t('account.deleteFailed'))
        return false
      }
      // the server side is gone — leave nothing local behind either
      try {
        localStorage.removeItem(PERSIST_KEY)
        localStorage.removeItem(TOKEN_KEY)
      } catch {
        /* storage unavailable — navigation still resets the app */
      }
      __resetSync()
      navigate({ to: '/login' })
      return true
    },
    logout: async () => {
      // revoke BEFORE navigating — /login's bootstrap re-adopts any cookie
      // session that is still alive, which would undo the logout (offline
      // touches the real auth server)
      if (HAS_API) await signOut()
      set({ userEmail: undefined })
      __resetSync() // the next login re-hydrates/imports from scratch
      navigate({ to: '/login' })
    },
    // real credential submit (BE1) — returns an error message for the form,
    // or null on success (stores the bearer token, then navigates in).
    submitAuth: async (email: string, password: string): Promise<string | null> => {
      // a real product cannot sign in without its API — surface it honestly
      if (!HAS_API) return i18n.t('errors.apiNetwork')
      const err =
        nav.authView === 'signup'
          ? await signUp(email.split('@')[0] || email, email, password)
          : await signIn(email, password)
      if (err) return err
      const me = await fetchMe()
      if (me) adoptAccount(me)
      // start syncing this user's op-log immediately — no reload needed
      hydrateSync()
      hydrateAfterLogin()
      // onboarding is keyed on assistantName, NOT the signup/login branch: a
      // user who abandoned onboarding (name still null) must be RESUMED into
      // it on their next email login, exactly as social login already does
      navigate(me && me.assistantName === null ? { to: '/onboarding' } : { to: '/' })
      return null
    },
    // UX: OAuth in a POPUP — this window keeps its state; the popup lands
    // the bearer in shared localStorage and we adopt it right here. A popup
    // blocker degrades to the classic full redirect; an abandoned popup is
    // silence, not an error.
    socialLogin: async (provider: 'google' | 'github'): Promise<string | null> => {
      if (!HAS_API) return i18n.t('errors.apiNetwork')
      const out = await signInSocialPopup(provider)
      if (out === 'blocked') return await signInSocial(provider)
      if (out === 'closed') return null
      if (out !== 'ok') return out
      const me = await fetchMe()
      if (me) adoptAccount(me)
      hydrateSync()
      hydrateAfterLogin()
      // a first-ever social account has no assistant name yet — onboarding
      navigate(me && me.assistantName === null ? { to: '/onboarding' } : { to: '/' })
      return null
    },
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
    // clears any transient response state (stop a stream view, dismiss a card)
    setDone: () => set({ respState: 'done' }),
    approveTool: () => set({ respState: 'done' }),
    denyTool: () => set({ respState: 'done' }),
    isEmptyChat: activeThread.length === 0,
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
    // capability-gated: the chip only exists for models that can reason —
    // it stays visible at “Tắt” so the user can turn thinking back on
    showThinkChip: !!findModel(s.slots[s.activeSlot]).caps.reasoning,
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
    // data
    suggestions,
    providers,
    smartChoices: slotChoices('smart'),
    fastChoices: slotChoices('fast'),
    // B6c — the ollama section inside its provider config
    ollamaCatalog: {
      models: s.ollamaModels.map((m) => ({
        id: m.id,
        name: m.name,
        size: m.size ?? '',
        caps: m.caps,
      })),
      refresh: () => void ollamaRefresh(),
      pull: ollamaPullStart,
      pulling: s.ollamaPull,
    },
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
      threads: t('projects.threads', { count: convCount(p.id) }),
    })),
    activeProjectId,
    activeProjectName: activeProject?.name ?? t('projects.defaultName'),
    currentProjectName,
    viewProjectId: viewProject?.id ?? 'chung',
    viewProjectName: viewProject?.name ?? t('projects.defaultName'),
    viewProjectDescription: viewProject?.description ?? '',
    viewProjectAccent: viewProject?.accent ?? 'var(--faint)',
    viewProjectIsDefault: !!viewProject?.isDefault,
    // reference documents — open in the preview overlay, removable in config
    viewProjectFiles: (viewProject?.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      meta: f.meta,
      kind: f.kind,
      open: () => set({ preview: { kind: f.kind, name: f.name, url: f.url } }),
      remove: () => removeProjectFile(viewProject?.id ?? 'chung', f.id),
    })),
    addViewProjectFile: (file: File) => addProjectFile(viewProject?.id ?? 'chung', file),
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
      title: c.title ?? t('nav.untitled'),
      untitled: c.title === null,
      projectName: s.projects.find((p) => p.id === c.projectId)?.name ?? t('projects.defaultName'),
      open: () => {
        set({ activeConv: c.id, palette: false, q: '' })
        goTo('/chat/$convId', { convId: c.id })
      },
    })),
    paletteProjects: s.projects.map((p) => ({
      id: p.id,
      name: p.name,
      dot: p.accent,
      open: () => {
        set({ palette: false, q: '' })
        goTo('/projects/$projectId', { projectId: p.id })
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
    versions,
    selectVersion,
    copyMessage,
    copiedMsg: s.copiedMsg,
    setFeedback,
    regenerate,
    editingMsg: s.editingMsg,
    startEdit: (id: string) => set({ editingMsg: id }),
    cancelEdit: () => set({ editingMsg: null }),
    saveEdit: (text: string) => {
      if (s.editingMsg) editMessage(s.editingMsg, text)
    },
    typing: s.typing,
    typingLabel: s.typingLabel,
    activeCount,
    // real context indicator: this conversation's tokens against the ACTIVE
    // model's actual window (1M/200k/…) — honest numerator AND denominator.
    // Dynamic models without a known window fall back to 200k. usedPct drives
    // the bar's fill (grows with usage); the label reads the complementary
    // REMAINING share, so both must derive from the SAME number — a second
    // hardcoded string here is exactly the bug that shipped before ("58% left"
    // never moved because it was a literal, not a computed value).
    tokenPct: `${usedPct}%`,
    tokenLabel: t('meter.tokenLabel', { pct: 100 - usedPct }),
    tokenDetail: t('meter.usageDetail', {
      inTok: fmtTokens(usageIn),
      outTok: fmtTokens(usageOut),
      // zero usage reads as "nothing spent yet" — NEVER "(Account)", which
      // would falsely claim the reason is a subscription profile even when
      // the active profile is a paid API key that simply hasn't been used
      cost:
        usageIn + usageOut === 0
          ? t('meter.costNone')
          : usageCost === 0
            ? t('meter.costFree')
            : fmtCost(usageCost),
    }),
    copyLabel: s.copied ? t('common.copied') : t('common.copy'),
    copied: s.copied,
    quietClock: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
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
    pickSmart: () => set({ activeSlot: 'smart' }),
    pickFast: () => set({ activeSlot: 'fast' }),
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
    canSend:
      s.draft.trim().length > 0 &&
      !activeStaged.some((f) => f.progress !== undefined) &&
      (s.profiles[s.slots[s.activeSlot].providerId] ?? []).length > 0,
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
