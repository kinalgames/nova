import { Fragment, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { API_BASE } from '../services/llm'
import { getToken } from '../services/token'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { GrowingTextarea } from './GrowingTextarea'
import { BTN_PRIMARY, BTN_SECONDARY } from './ui'
import type {
  Block,
  Message,
  MsgAction,
  MsgAttachment,
  MsgState,
  PreviewKind,
  TraceStep,
} from '../state/types'

/** full markdown renderer — lazy so the parser + shiki stay out of the main chunk */
const Markdown = lazy(() => import('./Markdown'))

const USER_LABEL = 'mb-2.5 font-mono text-eyebrow tracking-[.12em] text-muted'
const NOVA_HEAD = 'mb-3 flex items-center gap-2'
const NOVA_DOT = 'flex size-[22px] items-center justify-center rounded-full bg-accent text-bg'
const NOVA_TAG = 'font-mono text-eyebrow tracking-[.12em] text-accent-text'
const ACT = 'inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-left'
const NODE = 'absolute -left-[29px] top-0.5 size-[11px] rounded-full border-2 bg-bg'
const NODE_TEXT = 'text-body text-text'
const TOOL_TAG = 'inline-flex items-center gap-1 font-mono text-meta text-muted'
const META_ROW = 'mt-1.5 flex items-center gap-2'
const TCELL = 'border-t border-border px-3 py-2.5'
const THEAD = 'bg-panel px-3 py-2.5 font-medium text-muted'
const CARET = 'ml-0.5 inline-block h-[19px] w-0.5 bg-accent align-[-3px] animate-[caret_1.1s_steps(1)_infinite]'
const FILE_PILL =
  'flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-panel px-3 py-2 text-left'

const FILE_BADGE: Record<string, { cls: string; label: string }> = {
  pdf: { cls: 'bg-danger-bg text-danger-text', label: 'PDF' },
  md: { cls: 'bg-fill text-accent-text', label: 'MD' },
  code: { cls: 'bg-info-bg text-info', label: 'PY' },
  csv: { cls: 'bg-success-bg text-success-text', label: 'CSV' },
  image: { cls: 'bg-fill text-accent-text', label: 'IMG' },
}

const TONE: Record<string, string> = {
  danger: 'text-danger-text',
  success: 'text-success-text',
  warn: 'text-warn-text',
  muted: 'text-muted',
  accent: 'text-accent-text',
}

type V = ReturnType<typeof useStore>['v']

function openPreview(v: V, kind: PreviewKind) {
  if (kind === 'image') v.openLightbox()
  else if (kind === 'pdf') v.openPdf()
  else if (kind === 'md') v.openMd()
  else if (kind === 'csv') v.openCsv()
  else if (kind === 'code') v.openCode()
}

function runAction(v: V, action: MsgAction['action']) {
  if (action === 'copy') v.copyCode()
  else if (action === 'retry') v.setError()
  else openPreview(v, action)
}

/** plain-text approximation of a markdown block — Suspense fallback while the
 * Markdown chunk loads, so text never flashes empty */
function Rich({ text }: { text: string }): ReactNode {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {inline(line)}
        </Fragment>
      ))}
    </>
  )
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index))
    if (m[1] != null) out.push(<b key={i++} className="font-semibold">{m[1]}</b>)
    else out.push(<em key={i++}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

/** B1 — a real image tile. The session-local object URL renders instantly;
 *  after a reload the bytes come back through an authenticated fetch (a
 *  plain <img src> cannot carry the bearer). Demo items keep the gradient. */
function ImageTile({ f }: { f: MsgAttachment }) {
  const { v } = useStore()
  const [fetched, setFetched] = useState<string | null>(null)
  useEffect(() => {
    if (!f.fileId || f.url) return
    let stop = false
    let url: string | null = null
    void (async () => {
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE}/v1/files/${f.fileId}`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })
        if (!res.ok || stop) return
        url = URL.createObjectURL(await res.blob())
        if (!stop) setFetched(url)
      } catch {
        /* placeholder gradient stays */
      }
    })()
    return () => {
      stop = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [f.fileId, f.url])
  const src = f.url ?? fetched
  return (
    <button
      type="button"
      onClick={() =>
        src ? window.open(src, '_blank', 'noopener') : openPreview(v, f.open ?? 'image')
      }
      className="relative h-[104px] w-[150px] cursor-pointer overflow-hidden rounded-md border border-edge-soft text-left"
      style={{
        background: src
          ? `center/cover url(${src})`
          : 'linear-gradient(135deg,#E7C9A8,#C98F86 55%,#7E6E92)',
      }}
    >
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-[linear-gradient(transparent,rgba(0,0,0,.45))] px-2 py-1.5">
        <span className="min-w-0 truncate text-eyebrow text-white">{f.name}</span>
        <Icon n="expand" size={13} className="shrink-0 text-white" />
      </div>
    </button>
  )
}

function FilePill({ f }: { f: MsgAttachment }) {
  const { v } = useStore()
  if (f.image) return <ImageTile f={f} />
  const b = FILE_BADGE[f.kind] ?? FILE_BADGE.pdf
  return (
    <button type="button" onClick={() => openPreview(v, f.open ?? f.kind)} className={FILE_PILL}>
      <span className={`flex h-[30px] w-[26px] shrink-0 items-center justify-center rounded-xs font-mono text-micro ${b.cls}`}>
        {b.label}
      </span>
      <div className="min-w-0">
        <div className="max-w-[200px] truncate text-small">{f.name}</div>
        {f.meta && <div className="truncate text-eyebrow text-muted">{f.meta}</div>}
      </div>
    </button>
  )
}

function TraceView({ steps, open }: { steps: TraceStep[]; open: boolean }) {
  const { v } = useStore()
  if (!open) return null
  return (
    <div className="relative mb-1.5 flex flex-col gap-4 border-l-2 border-border pl-5">
      {steps.map((st, i) => {
        if (st.kind === 'think') {
          return (
            <div key={i} className="relative">
              <span className="absolute -left-[29px] top-0.5 size-2.5 rounded-full border-2 border-dashed border-border bg-bg" />
              <div className="text-body italic leading-normal text-muted">{st.text}</div>
            </div>
          )
        }
        if (st.kind === 'done') {
          return (
            <div key={i} className="relative">
              <span className="absolute -left-[30px] top-px flex size-[13px] items-center justify-center rounded-full bg-accent text-bg">
                <Icon n="check" size={9} stroke={2.5} />
              </span>
              <div className="text-ui font-medium text-text-2">
                {st.title} <span className="font-normal text-faint">{st.detail}</span>
              </div>
            </div>
          )
        }
        const nodeCls =
          st.node === 'danger' ? 'border-danger' : st.node === 'accent' ? 'border-accent' : 'border-border'
        return (
          <div key={i} className="relative">
            <span className={`${NODE} ${nodeCls}`} />
            <div className={NODE_TEXT}>
              {st.title} {st.detail && <span className="text-muted">{st.detail}</span>}
            </div>
            {st.quote && v.advanced && (
              <div className="mt-1.5 border-l-2 border-border pl-3 text-ui italic leading-normal text-text-2">
                {st.quote}
              </div>
            )}
            {st.code && v.advanced && (
              <div className="mt-2 overflow-hidden rounded-sm bg-code-bg">
                <div className="px-3 py-2.5 font-mono text-meta leading-relaxed text-code-fg">
                  {st.code.map((line, li) => (
                    <Fragment key={li}>
                      {li > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
            {st.tool && v.advanced && (
              <div className={`${META_ROW} flex-wrap`}>
                <span className={`${TOOL_TAG} whitespace-nowrap`}>
                  {st.toolIcon && <Icon n={st.toolIcon} size={13} />} {st.tool}
                </span>
                {st.query && <span className="font-mono text-eyebrow text-muted">{st.query}</span>}
                {st.result && (
                  <span className={`ml-auto font-mono text-eyebrow ${TONE[st.resultTone ?? 'muted']}`}>
                    {st.result}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BlockView({ block, streaming }: { block: Block; streaming?: boolean }) {
  const { v } = useStore()
  const { t } = useTranslation()
  switch (block.type) {
    case 'text':
      return (
        <div className={`${block.size === 'lead' ? 'text-lead' : 'text-body'} mt-3 leading-relaxed first:mt-0`}>
          <Suspense fallback={<Rich text={block.text} />}>
            <Markdown text={block.text} />
          </Suspense>
          {streaming && <span className={CARET} />}
        </div>
      )
    case 'files':
      return (
        <div className="mt-4">
          {block.label && (
            <div className="mb-2 font-mono text-eyebrow tracking-[.12em] text-label">{block.label}</div>
          )}
          <div className="flex flex-wrap gap-2.5">
            {block.items.map((f, i) => (
              <FilePill key={i} f={f} />
            ))}
          </div>
        </div>
      )
    case 'trace':
      return (
        <div className="mt-3">
          <button
            type="button"
            onClick={v.toggleTrace}
            className="mb-3 inline-flex cursor-pointer items-center gap-2.5 rounded-sm border border-border bg-panel px-3 py-2 text-left text-ui text-text-2"
          >
            <span className="flex size-[18px] items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon n="check" size={11} stroke={2.25} />
            </span>
            <span className="text-text">{block.summary}</span>
            <span className="inline-flex items-center gap-1 text-meta text-faint">
              {v.traceOpen ? t('chat.traceHide') : block.meta}
              <Icon n="caret" size={12} className={v.traceOpen ? 'rotate-180' : undefined} />
            </span>
          </button>
          <TraceView steps={block.steps} open={v.traceOpen} />
        </div>
      )
    case 'table':
      return (
        <div className="mt-4 overflow-hidden rounded-sm border border-border font-sans text-ui">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${block.head.length}, minmax(0,1fr))` }}
          >
            {block.head.map((h, i) => (
              <div key={`h${i}`} className={THEAD}>
                {h}
              </div>
            ))}
            {block.rows.map((row, ri) =>
              row.map((cell, ci) => (
                <div key={`${ri}-${ci}`} className={`${TCELL} ${cell.tone ? TONE[cell.tone] : ''}`}>
                  {cell.text}
                </div>
              )),
            )}
          </div>
        </div>
      )
    case 'sources':
      return (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-small text-muted">
          <span>{t('chat.sources')}</span>
          {block.items.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openPreview(v, s.open)}
              className="cursor-pointer rounded-xs border border-border bg-transparent px-2 py-0.5 text-left"
            >
              <sup>{s.n}</sup> {s.label}
            </button>
          ))}
        </div>
      )
    case 'actions':
      return (
        <div className="mt-4 flex flex-wrap gap-4 text-small text-muted">
          {block.items.map((a, i) => (
            <button key={i} type="button" onClick={() => runAction(v, a.action)} className={ACT}>
              <Icon n={a.action === 'copy' && v.copied ? 'check' : a.icon} size={14} />{' '}
              {a.action === 'copy' ? v.copyLabel : a.label}
            </button>
          ))}
        </div>
      )
  }
}

function ApprovalCard({ tool, command }: { tool: string; command: string }) {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-panel">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent-text">
          <Icon n="terminal" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-body">{t('chat.approvalTitle', { tool })}</div>
          <div className="truncate font-mono text-meta text-muted">{command}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        <button type="button" onClick={v.approveTool} className={BTN_PRIMARY}>
          {t('chat.approvalAllow')}
        </button>
        <button type="button" onClick={v.denyTool} className="cursor-pointer rounded-sm border border-border bg-transparent px-4 py-2 text-left text-ui text-muted">
          {t('chat.approvalDeny')}
        </button>
        <span className="text-meta text-muted">{t('chat.approvalNote')}</span>
      </div>
    </div>
  )
}

/** ‹ i/n › version switcher — rendered only at real forks */
function VersionNav({ id }: { id: string }) {
  const { v } = useStore()
  const { t } = useTranslation()
  const info = v.versions[id]
  if (!info || info.count < 2) return null
  const btn =
    'flex cursor-pointer items-center border-none bg-transparent px-0.5 text-faint outline-none hover:text-text-2 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-eyebrow text-faint">
      <button type="button" aria-label={t('chat.prevVersion')} disabled={info.index <= 1} onClick={() => v.selectVersion(id, -1)} className={btn}>
        ‹
      </button>
      {info.index}/{info.count}
      <button type="button" aria-label={t('chat.nextVersion')} disabled={info.index >= info.count} onClick={() => v.selectVersion(id, 1)} className={btn}>
        ›
      </button>
    </span>
  )
}

/** per-message actions — hover-revealed, always visible on the last message */
function ActionRow({ message, isLast }: { message: Message; isLast?: boolean }) {
  const { v } = useStore()
  const { t } = useTranslation()
  const copied = v.copiedMsg === message.id
  const btn =
    'flex cursor-pointer items-center rounded-sm border-none bg-transparent p-1 text-faint outline-none hover:text-text-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  return (
    <div
      className={`mt-1.5 flex items-center gap-0.5 ${
        isLast ? '' : 'touch-show opacity-0 transition-opacity group-hover/msg:opacity-100 group-focus-within/msg:opacity-100'
      }`}
    >
      <button type="button" aria-label={t('common.copy')} onClick={() => v.copyMessage(message.id)} className={btn}>
        <Icon n={copied ? 'check' : 'copy'} size={14} />
      </button>
      {message.role === 'user' ? (
        <button type="button" aria-label={t('chat.edit')} onClick={() => v.startEdit(message.id)} className={btn}>
          <Icon n="write" size={14} />
        </button>
      ) : (
        <>
          <button type="button" aria-label={t('chat.regenerate')} onClick={() => v.regenerate(message.id)} className={btn}>
            <Icon n="retry" size={14} />
          </button>
          <button
            type="button"
            aria-label={t('chat.good')}
            aria-pressed={message.feedback === 'up'}
            onClick={() => v.setFeedback(message.id, 'up')}
            className={`${btn} ${message.feedback === 'up' ? 'text-accent-text' : ''}`}
          >
            <Icon n="thumbUp" size={14} />
          </button>
          <button
            type="button"
            aria-label={t('chat.bad')}
            aria-pressed={message.feedback === 'down'}
            onClick={() => v.setFeedback(message.id, 'down')}
            className={`${btn} ${message.feedback === 'down' ? 'text-accent-text' : ''}`}
          >
            <Icon n="thumbDown" size={14} />
          </button>
        </>
      )}
    </div>
  )
}

/** inline edit-and-rerun for a user message */
function EditForm({ message }: { message: Message }) {
  const { v } = useStore()
  const { t } = useTranslation()
  const orig = message.blocks.find((b) => b.type === 'text')
  const [val, setVal] = useState(orig && orig.type === 'text' ? orig.text : '')
  return (
    <div className="field rounded-lg border border-border bg-panel px-3 pb-2.5 pt-2.5">
      <GrowingTextarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        aria-label={t('chat.editAria')}
        className="w-full text-body text-text"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={v.cancelEdit}
          className="cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-muted"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => v.saveEdit(val)}
          disabled={!val.trim()}
          className={BTN_PRIMARY}
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <NovaThinking />
      <span className="text-ui text-text-2">{label}</span>
    </div>
  )
}

function NovaThinking() {
  const { t } = useTranslation()
  return (
    <span
      role="img"
      aria-label={t('chat.novaWorking')}
      className="relative flex size-[22px] shrink-0 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full bg-accent-line animate-[pulseRing_1.6s_ease-out_infinite]" />
      <span className="relative flex size-[22px] items-center justify-center rounded-full bg-accent text-bg animate-[breathe_2.4s_ease-in-out_infinite]">
        <Icon n="nova" size={13} />
      </span>
    </span>
  )
}

export function MessageView({
  message,
  state,
  typing,
  isLast,
}: {
  message: Message
  /** overrides the message's render state (demo switcher / live stream) */
  state?: MsgState
  /** live typing caret on the final text block */
  typing?: boolean
  /** last visible message — its actions stay visible without hover */
  isLast?: boolean
}) {
  const { v } = useStore()
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const trace = message.blocks.find((b) => b.type === 'trace')
  const answer = message.blocks.filter((b) => b.type !== 'trace')

  if (isUser) {
    return (
      <div className="group/msg mb-8 mt-8 first:mt-0">
        <div className={`${USER_LABEL} flex items-center gap-2`}>
          <span>{message.who}</span>
          <VersionNav id={message.id} />
        </div>
        {v.editingMsg === message.id ? (
          <EditForm key={message.id} message={message} />
        ) : (
          <>
            {message.blocks.map((b, i) => (
              <BlockView key={i} block={b} />
            ))}
            <ActionRow message={message} isLast={isLast} />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="group/msg mb-8 mt-8 first:mt-0">
      <div className={NOVA_HEAD}>
        <span className={NOVA_DOT}>
          <Icon n="nova" size={13} />
        </span>
        <span className={NOVA_TAG}>{message.who}</span>
        <VersionNav id={message.id} />
        {state === 'streaming' && (
          <span className="text-meta text-faint">{t('chat.streamReplying')}</span>
        )}
        {v.msgUsage(message) && (
          <span className="font-mono text-meta text-faint">{v.msgUsage(message)}</span>
        )}
      </div>

      {trace && <BlockView block={trace} />}

      {state === 'streaming' ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2.5">
            <NovaThinking />
            <span className="text-ui text-text-2">{t('chat.writingLabel')}</span>
          </div>
          <button
            type="button"
            onClick={v.setDone}
            className={BTN_SECONDARY}
          >
            <Icon n="stop" size={13} fill="currentColor" stroke={0} /> {t('common.stop')}
          </button>
        </div>
      ) : state === 'approval' && message.approval ? (
        <ApprovalCard tool={message.approval.tool} command={message.approval.command} />
      ) : state === 'error' ? (
        <>
          {answer.slice(0, 1).map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-md border border-danger-line bg-danger-bg px-4 py-3">
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-danger-strong text-small text-on-ink">
              !
            </span>
            <div className="min-w-0 flex-1 basis-[14rem]">
              <div className="text-body text-text">
                {v.errorAction === 'providers' ? t('chat.noProviderTitle') : t('chat.errorTitle')}
              </div>
              <div className="mt-0.5 text-ui leading-normal text-danger-text">
                {/* the SPECIFIC live error when present; the demo card keeps its
                    generic copy + fake trace tail */}
                {v.errorDetail ?? t('chat.errorBody')}
                {v.advanced && !v.errorDetail && (
                  <span className="font-mono text-eyebrow text-danger-text"> · err 503 · stream_closed</span>
                )}
                {/* B4 — correlation id: quote this to match server logs */}
                {v.errorRequestId && (
                  <div className="mt-1 font-mono text-eyebrow text-muted">req {v.errorRequestId}</div>
                )}
              </div>
            </div>
            {v.errorAction === 'providers' ? (
              <button
                type="button"
                onClick={() => v.openSettings('providers')}
                className={`${BTN_PRIMARY} shrink-0`}
              >
                <Icon n="plus" size={14} /> {t('chat.addProviderCta')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (v.errorAction === 'retry' ? v.regenerate(message.id) : v.setDone())}
                className={`${BTN_PRIMARY} shrink-0`}
              >
                <Icon n="retry" size={14} /> {t('common.retry')}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {answer.map((b, i) => (
            <BlockView key={i} block={b} streaming={typing && i === answer.length - 1 && b.type === 'text'} />
          ))}
          {!typing && <ActionRow message={message} isLast={isLast} />}
        </>
      )}
    </div>
  )
}
