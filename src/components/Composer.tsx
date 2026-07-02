import { useRef } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { GrowingTextarea } from './GrowingTextarea'
import type { StagedFile } from '../state/types'

const POPUP =
  'z-40 max-w-[78vw] rounded-md border border-border bg-panel p-1.5 shadow-pop ' +
  'origin-bottom animate-[fadeUp_140ms_var(--ease-paper)]'
const POPUP_LABEL = 'px-3 pb-1 pt-2 font-mono text-eyebrow tracking-[0.14em] text-label'
const ROW =
  'flex cursor-pointer select-none items-center gap-3 rounded-sm px-3 py-2.5 outline-none data-[highlighted]:bg-black/[0.04]'
const TOOL_ROW =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-3 py-2.5 outline-none data-[highlighted]:bg-black/[0.04]'

const badgeStyle: Record<string, { bg: string; fg: string; label: string }> = {
  pdf: { bg: 'var(--danger-bg)', fg: 'var(--danger-text)', label: 'PDF' },
  code: { bg: 'var(--info-bg)', fg: 'var(--info)', label: 'PY' },
  csv: { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'CSV' },
  md: { bg: 'var(--fill)', fg: 'var(--accent)', label: 'MD' },
  image: { bg: 'var(--fill)', fg: 'var(--accent)', label: 'IMG' },
}

function StagedItem({ f }: { f: StagedFile }) {
  const { v } = useStore()
  if (f.kind === 'image') {
    const bg = f.url
      ? `center/cover url(${f.url})`
      : 'linear-gradient(135deg,#E7C9A8,#C98F86 55%,#7E6E92)'
    return (
      <div className="relative size-[54px] shrink-0">
        <button
          type="button"
          aria-label={`Mở ${f.name}`}
          onClick={() => v.openStaged(f)}
          className="block size-[54px] cursor-pointer rounded-sm border border-[rgba(0,0,0,.06)] p-0"
          style={{ background: bg }}
        />
        <button
          type="button"
          aria-label={`Bỏ ${f.name}`}
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
    <div className="relative flex items-center gap-2 rounded-sm border border-border bg-panel py-1.5 pl-2 pr-3">
      <button
        type="button"
        aria-label={`Mở ${f.name}`}
        onClick={() => v.openStaged(f)}
        className="flex min-w-0 cursor-pointer items-center gap-2 border-none bg-transparent text-left"
      >
        <span
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded-xs font-mono text-micro"
          style={{ background: b.bg, color: b.fg }}
        >
          {b.label}
        </span>
        <div>
          <div className="text-small">{f.name}</div>
          <div className="text-eyebrow text-muted">{f.size}</div>
        </div>
      </button>
      <button
        type="button"
        aria-label={`Bỏ ${f.name}`}
        onClick={() => v.removeStaged(f.id)}
        className="ml-1 flex cursor-pointer border-none bg-transparent text-faint"
      >
        <Icon n="close" size={14} />
      </button>
    </div>
  )
}

export function Composer() {
  const { v, addUpload } = useStore()
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
                  aria-label="Thêm vào chat"
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
                  <div className={POPUP_LABEL}>THÊM VÀO CHAT</div>
                  <DropdownMenu.Item onSelect={() => imgInput.current?.click()} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-fill text-accent">
                      <Icon n="image" size={15} />
                    </span>
                    <div className="text-ui text-text">Tải ảnh lên</div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => fileInput.current?.click()} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-border text-text-2">
                      <Icon n="file" size={15} />
                    </span>
                    <div>
                      <div className="text-ui text-text">Tải tệp lên</div>
                      <div className="text-meta text-muted">PDF, tài liệu, mã, bảng tính</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={v.goProjects} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                      <Icon n="folder" size={15} />
                    </span>
                    <div>
                      <div className="text-ui text-text">Thêm từ dự án</div>
                      <div className="text-meta text-muted">Tài liệu trong Aurora</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={v.openLightbox} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-sm bg-border text-text-2">
                      <Icon n="expand" size={15} />
                    </span>
                    <div className="text-ui text-text">Chụp màn hình</div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border" />
                  <div className={POPUP_LABEL}>CÔNG CỤ CỦA NOVA</div>
                  {(
                    [
                      ['web', 'search', 'Tra cứu web', v.webRowFg, v.webCheck, v.toggle_web],
                      ['fetch', 'fetch', 'Đọc trang web', v.fetchRowFg, v.fetchCheck, v.toggle_fetch],
                      ['files', 'file', 'Tài liệu của bạn', v.filesRowFg, v.filesCheck, v.toggle_files],
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
              aria-label="Nhắn cho Nova"
              placeholder="Trả lời Nova…"
              className="min-w-0 flex-1 py-2 text-lead text-text"
            />
            {v.typing ? (
              <button
                type="button"
                aria-label="Dừng"
                onClick={v.stop}
                className="tap flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-ink text-bg"
              >
                <Icon n="stop" size={14} fill="currentColor" stroke={0} />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Gửi"
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
                  aria-label={`Dự án: ${v.chatProject}`}
                  className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1 text-small text-text-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="size-2 rounded-xs bg-accent" />
                  {v.chatProject}
                  <Icon n="caret" size={12} className="text-faint" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content side="top" align="start" sideOffset={8} className={`${POPUP} w-[240px]`}>
                  <div className={`${POPUP_LABEL} text-faint`}>CHAT TRONG DỰ ÁN</div>
                  {v.pickProjects.map((pp, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onSelect={pp.pick}
                      className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-ui text-text outline-none data-[highlighted]:bg-black/[0.04]"
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
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label={`Mức suy nghĩ: ${v.thinkLabel}`}
                    className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap border-none bg-transparent text-meta text-text-2 outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Icon n="think" size={13} /> Suy nghĩ: {v.thinkLabel}{' '}
                    <Icon n="caret" size={12} className="text-faint" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content side="top" align="end" sideOffset={8} className={`${POPUP} w-[220px]`}>
                    <div className={POPUP_LABEL}>CHẾ ĐỘ SUY NGHĨ</div>
                    {(
                      [
                        [v.setThinkOff, 'Tắt', 'Trả lời ngay', v.thinkChkOff],
                        [v.setThinkLow, 'Thấp', 'Cân nhắc nhanh', v.thinkChkLow],
                        [v.setThinkNormal, 'Vừa', 'Cân bằng — khuyên dùng', v.thinkChkNormal],
                        [v.setThinkHigh, 'Cao', 'Suy luận sâu, chậm hơn', v.thinkChkHigh],
                      ] as const
                    ).map(([pick, label, sub, check], i) => (
                      <DropdownMenu.Item
                        key={i}
                        onSelect={pick}
                        className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2.5 outline-none data-[highlighted]:bg-black/[0.04]"
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
              {v.showComposerHint && (
                <span className="whitespace-nowrap font-mono text-eyebrow text-faint">
                  {v.activeCount} công cụ{v.isDesktop ? ' · ⏎ gửi' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
