import { useRef } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { GrowingTextarea } from './GrowingTextarea'
import type { StagedFile } from '../state/types'

const POPUP =
  'z-[80] max-w-[78vw] rounded-md border border-border bg-panel p-1.5 shadow-pop ' +
  'origin-bottom animate-[fadeUp_140ms_var(--ease-paper)]'
const POPUP_LABEL = 'px-3 pb-1 pt-2 font-mono text-eyebrow tracking-[0.14em] text-label'
const ROW =
  'flex cursor-pointer select-none items-center gap-3 rounded-sm px-3 py-2.5 outline-none data-[highlighted]:bg-hover-1'
const TOOL_ROW =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-3 py-2.5 outline-none data-[highlighted]:bg-hover-1'

const badgeStyle: Record<string, { bg: string; fg: string; label: string }> = {
  pdf: { bg: 'var(--danger-bg)', fg: 'var(--danger-text)', label: 'PDF' },
  code: { bg: 'var(--info-bg)', fg: 'var(--info)', label: 'PY' },
  csv: { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'CSV' },
  md: { bg: 'var(--fill)', fg: 'var(--accent)', label: 'MD' },
  image: { bg: 'var(--fill)', fg: 'var(--accent)', label: 'IMG' },
}

function StagedItem({ f }: { f: StagedFile }) {
  const { v } = useStore()
  const { t } = useTranslation()
  if (f.kind === 'image') {
    const bg = f.url
      ? `center/cover url(${f.url})`
      : 'linear-gradient(135deg,#E7C9A8,#C98F86 55%,#7E6E92)'
    return (
      <div className="relative size-[54px] shrink-0">
        <button
          type="button"
          aria-label={f.error ? `${f.name}: ${f.error}` : t('composer.openFile', { name: f.name })}
          title={f.error}
          onClick={() => v.openStaged(f)}
          className={`block size-[54px] cursor-pointer rounded-sm border p-0 ${
            f.error ? 'border-danger-line' : 'border-edge-soft'
          }`}
          style={{ background: bg }}
        />
        {f.progress !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-sm bg-[rgba(0,0,0,.45)] font-mono text-micro text-white">
            {f.progress}%
          </div>
        )}
        <button
          type="button"
          aria-label={t('composer.removeFile', { name: f.name })}
          onClick={() => v.removeStaged(f.id)}
          className="absolute -right-1.5 -top-1.5 z-[1] flex size-[18px] cursor-pointer items-center justify-center rounded-full border-none bg-ink text-on-ink"
        >
          <Icon n="close" size={11} stroke={2.25} />
        </button>
      </div>
    )
  }
  const b = badgeStyle[f.kind] || badgeStyle.pdf
  return (
    <div
      className={`relative flex items-center gap-2 rounded-sm border bg-panel py-1.5 pl-2 pr-3 ${
        f.error ? 'border-danger-line' : 'border-border'
      }`}
    >
      <button
        type="button"
        aria-label={t('composer.openFile', { name: f.name })}
        onClick={() => v.openStaged(f)}
        className="flex min-w-0 cursor-pointer items-center gap-2 border-none bg-transparent text-left"
      >
        <span
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded-xs font-mono text-micro"
          style={{ background: b.bg, color: b.fg }}
        >
          {b.label}
        </span>
        <div className="min-w-0">
          <div className="max-w-[180px] truncate text-small">{f.name}</div>
          <div className={`max-w-[180px] truncate text-eyebrow ${f.error ? 'text-danger' : 'text-muted'}`}>
            {f.error ?? (f.progress !== undefined ? `${f.progress}%` : f.size)}
          </div>
        </div>
      </button>
      <button
        type="button"
        aria-label={t('composer.removeFile', { name: f.name })}
        onClick={() => v.removeStaged(f.id)}
        className="ml-1 flex cursor-pointer border-none bg-transparent text-faint"
      >
        <Icon n="close" size={14} />
      </button>
    </div>
  )
}

export function Composer({ placeholder }: { placeholder?: string } = {}) {
  const { v, addUpload } = useStore()
  const { t } = useTranslation()
  const imgInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) Array.from(files).forEach(addUpload)
    e.target.value = ''
  }

  return (
    <div className="relative flex shrink-0 justify-center px-3 pb-3 pt-2.5">
      <div className="relative w-[680px] max-w-full">
        <div className="field rounded-lg border border-border bg-panel px-2.5 pb-2 pt-2.5">
          {/* staged attachments */}
          {v.hasStaged && (
            <div className="flex flex-wrap gap-2 px-1 pb-2.5 pt-1">
              {v.staged.map((f) => (
                <StagedItem key={f.id} f={f} />
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* hidden real file inputs */}
            <input ref={imgInput} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
            <input ref={fileInput} type="file" multiple onChange={onFiles} className="hidden" />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={t('composer.addToChat')}
                  className="tap flex size-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Icon n="plus" size={20} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={8}
                  className={`${POPUP} max-h-[60vh] w-[300px] overflow-y-auto`}
                >
                  <div className={POPUP_LABEL}>{t('composer.addToChatLabel')}</div>
                  <DropdownMenu.Item onSelect={() => imgInput.current?.click()} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-fill text-accent">
                      <Icon n="image" size={15} />
                    </span>
                    <div className="text-ui text-text">{t('composer.uploadImage')}</div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => fileInput.current?.click()} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-border text-text-2">
                      <Icon n="file" size={15} />
                    </span>
                    <div>
                      <div className="text-ui text-text">{t('composer.uploadFile')}</div>
                      <div className="text-meta text-muted">{t('composer.uploadFileSub')}</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={v.goProjects} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                      <Icon n="folder" size={15} />
                    </span>
                    <div>
                      <div className="text-ui text-text">{t('composer.fromProject')}</div>
                      <div className="text-meta text-muted">
                        {t('composer.fromProjectSub', { project: v.chatProject })}
                      </div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border" />
                  <div className={POPUP_LABEL}>{t('composer.novaTools')}</div>
                  {(
                    [
                      ['web', 'search', t('composer.toolWeb'), v.webRowFg, v.webCheck, v.toggle_web],
                      ['fetch', 'fetch', t('composer.toolFetch'), v.fetchRowFg, v.fetchCheck, v.toggle_fetch],
                      ['files', 'file', t('composer.toolFiles'), v.filesRowFg, v.filesCheck, v.toggle_files],
                      ['bash', 'terminal', v.bashLabel, v.bashRowFg, v.bashCheck, v.toggle_bash],
                    ] as const
                  ).map(([key, icon, label, fg, check, toggle]) => (
                    <DropdownMenu.Item
                      key={key}
                      onSelect={(e) => {
                        e.preventDefault()
                        toggle()
                      }}
                      className={TOOL_ROW}
                      style={{ color: fg }}
                    >
                      <span className="flex w-5 justify-center">
                        <Icon n={icon} size={16} />
                      </span>
                      <span className="flex-1 text-ui">{label}</span>
                      {check && <Icon n="check" size={14} className="text-accent" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <GrowingTextarea
              value={v.draft}
              onChange={v.onDraft}
              onKeyDown={v.onKey}
              aria-label={t('home.inputAria')}
              // no provider connected → the input is honestly disabled and
              // says WHY; the nudge card above carries the CTA
              disabled={v.needsProvider}
              placeholder={
                v.needsProvider ? t('composer.needProvider') : (placeholder ?? t('composer.replyPlaceholder'))
              }
              className={`min-w-0 flex-1 py-2 text-lead text-text ${v.needsProvider ? 'opacity-60' : ''}`}
            />
            {v.typing ? (
              <button
                type="button"
                aria-label={t('common.stop')}
                onClick={v.stop}
                className="tap flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-ink text-bg"
              >
                <Icon n="stop" size={14} fill="currentColor" stroke={0} />
              </button>
            ) : (
              <button
                type="button"
                aria-label={t('common.send')}
                onClick={v.send}
                disabled={!v.canSend}
                className="tap flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-ink text-bg opacity-100 transition-opacity duration-[120ms] disabled:cursor-default disabled:opacity-[.38]"
              >
                <Icon n="send" size={17} stroke={2} />
              </button>
            )}
          </div>

          {/* context row */}
          <div className="flex items-center justify-between px-1 pb-0.5 pt-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={t('composer.projectAria', { name: v.chatProject })}
                  className="tap-sm flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1 text-small text-text-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="size-2 rounded-xs bg-accent" />
                  {v.chatProject}
                  <Icon n="caret" size={12} className="text-faint" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content side="top" align="start" sideOffset={8} className={`${POPUP} w-[240px]`}>
                  <div className={`${POPUP_LABEL} text-faint`}>{t('composer.chatInProject')}</div>
                  {v.pickProjects.map((pp, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onSelect={pp.pick}
                      className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-ui text-text outline-none data-[highlighted]:bg-hover-1"
                      style={{ background: pp.bg }}
                    >
                      <span className="size-[9px] rounded-xs" style={{ background: pp.dot }} />
                      <span className="flex-1">{pp.name}</span>
                      {pp.check && <Icon n="check" size={13} className="text-accent" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <div className="flex items-center gap-3">
              {v.showThinkChip && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label={t('composer.thinkAria', { label: v.thinkLabel })}
                    className="tap-sm inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap border-none bg-transparent text-meta text-text-2 outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Icon n="think" size={13} /> {t('composer.thinkChip', { label: v.thinkLabel })}{' '}
                    <Icon n="caret" size={12} className="text-faint" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content side="top" align="end" sideOffset={8} className={`${POPUP} w-[220px]`}>
                    <div className={POPUP_LABEL}>{t('composer.thinkMenuLabel')}</div>
                    {(
                      [
                        [v.setThinkOff, t('composer.thinkOff'), t('composer.thinkOffSub'), v.thinkChkOff],
                        [v.setThinkLow, t('composer.thinkLow'), t('composer.thinkLowSub'), v.thinkChkLow],
                        [v.setThinkNormal, t('composer.thinkNormal'), t('composer.thinkNormalSub'), v.thinkChkNormal],
                        [v.setThinkHigh, t('composer.thinkHigh'), t('composer.thinkHighSub'), v.thinkChkHigh],
                      ] as const
                    ).map(([pick, label, sub, check], i) => (
                      <DropdownMenu.Item
                        key={i}
                        onSelect={pick}
                        className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2.5 outline-none data-[highlighted]:bg-hover-1"
                      >
                        <div className="flex-1">
                          <div className="text-ui text-text">{label}</div>
                          <div className="text-meta text-muted">{sub}</div>
                        </div>
                        {check && <Icon n="check" size={13} className="text-accent" />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              )}
              {v.showComposerHint && (
                <span className="whitespace-nowrap font-mono text-eyebrow text-faint">
                  {t('composer.toolCount', { count: v.activeCount })}
                  {v.isDesktop ? t('composer.enterHint') : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
