import { useRef } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'
import type { StagedFile } from '../state/types'

const POPUP =
  'z-40 max-w-[78vw] rounded-[14px] border border-border bg-panel p-[7px] shadow-pop ' +
  'origin-bottom animate-[fadeUp_140ms_var(--ease-paper)]'
const POPUP_LABEL = 'px-3 pb-[5px] pt-2 font-mono text-[9.5px] tracking-[0.14em] text-label'
const ROW =
  'flex cursor-pointer select-none items-center gap-3 rounded-[9px] px-3 py-2.5 outline-none data-[highlighted]:bg-black/[0.04]'
const TOOL_ROW =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-3 py-2.5 outline-none data-[highlighted]:bg-black/[0.04]'

const badgeStyle: Record<string, { bg: string; fg: string; label: string }> = {
  pdf: { bg: 'var(--danger-bg)', fg: 'var(--danger-strong)', label: 'PDF' },
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
      <div onClick={() => v.openStaged(f)} style={css(`position:relative;width:54px;height:54px;border-radius:10px;background:${bg};cursor:pointer;border:1px solid rgba(0,0,0,.06)`)}>
        <button
          type="button"
          aria-label={`Bỏ ${f.name}`}
          onClick={(e) => {
            e.stopPropagation()
            v.removeStaged(f.id)
          }}
          style={css('border:none;position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--ink);color:var(--on-ink);display:flex;align-items:center;justify-content:center;cursor:pointer')}
        >
          <Icon n="close" size={11} stroke={2.25} />
        </button>
      </div>
    )
  }
  const b = badgeStyle[f.kind] || badgeStyle.pdf
  return (
    <div onClick={() => v.openStaged(f)} style={css('position:relative;display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:7px 11px 7px 9px;cursor:pointer')}>
      <span style={css(`width:24px;height:28px;border-radius:4px;background:${b.bg};color:${b.fg};font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>{b.label}</span>
      <div>
        <div style={css('font-size:12.5px')}>{f.name}</div>
        <div style={css('font-size:10.5px;color:var(--muted)')}>{f.size}</div>
      </div>
      <button
        type="button"
        aria-label={`Bỏ ${f.name}`}
        onClick={(e) => {
          e.stopPropagation()
          v.removeStaged(f.id)
        }}
        style={css('background:transparent;border:none;margin-left:4px;color:var(--faint);cursor:pointer;display:flex')}
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
    <div style={css('flex-shrink:0;display:flex;justify-content:center;padding:10px 12px 14px;position:relative')}>
      <div style={css('width:680px;max-width:100%;position:relative')}>
        <div style={css('border:1px solid var(--border);border-radius:16px;background:var(--panel);padding:10px 10px 8px')}>
          {/* staged attachments */}
          {v.hasStaged && (
            <div style={css('display:flex;gap:8px;flex-wrap:wrap;padding:4px 4px 10px')}>
              {v.staged.map((f) => (
                <StagedItem key={f.id} f={f} />
              ))}
            </div>
          )}

          <div style={css('display:flex;align-items:flex-end;gap:8px')}>
            {/* hidden real file inputs */}
            <input ref={imgInput} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
            <input ref={fileInput} type="file" multiple onChange={onFiles} className="hidden" />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Thêm vào chat"
                  className="tap flex size-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-fill text-accent">
                      <Icon n="image" size={15} />
                    </span>
                    <div className="text-[14px] text-text">Tải ảnh lên</div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => fileInput.current?.click()} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-border text-text-2">
                      <Icon n="file" size={15} />
                    </span>
                    <div>
                      <div className="text-[14px] text-text">Tải tệp lên</div>
                      <div className="text-[11.5px] text-muted">PDF, tài liệu, mã, bảng tính</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={v.goProjects} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-accent">
                      <Icon n="folder" size={15} />
                    </span>
                    <div>
                      <div className="text-[14px] text-text">Thêm từ dự án</div>
                      <div className="text-[11.5px] text-muted">Tài liệu trong Aurora</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={v.openLightbox} className={ROW}>
                    <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-border text-text-2">
                      <Icon n="expand" size={15} />
                    </span>
                    <div className="text-[14px] text-text">Chụp màn hình</div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="mx-2 my-[5px] h-px bg-border" />
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
                      <span className="flex-1 text-[14px]">{label}</span>
                      {check && <Icon n="check" size={14} className="text-accent" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <input
              value={v.draft}
              onChange={v.onDraft}
              onKeyDown={v.onKey}
              aria-label="Nhắn cho Nova"
              placeholder="Trả lời Nova…"
              style={css('flex:1;min-width:0;font-size:17px;color:var(--text);padding:9px 0')}
            />
            <button type="button" aria-label="Gửi" onClick={v.send} className="tap" style={css('border:none;width:36px;height:36px;flex-shrink:0;border-radius:10px;background:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--bg)')}>
              <Icon n="send" size={17} stroke={2} />
            </button>
          </div>

          {/* context row */}
          <div style={css('display:flex;align-items:center;justify-content:space-between;padding:8px 4px 2px')}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Dự án: ${v.chatProject}`}
                  className="flex cursor-pointer items-center gap-[7px] rounded-[8px] border border-border bg-bg px-[9px] py-[5px] text-[12.5px] text-text-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="size-2 rounded-[2px] bg-accent" />
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
                      className="flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-[14px] text-text outline-none data-[highlighted]:bg-black/[0.04]"
                      style={{ background: pp.bg }}
                    >
                      <span className="size-[9px] rounded-[3px]" style={{ background: pp.dot }} />
                      <span className="flex-1">{pp.name}</span>
                      {pp.check && <Icon n="check" size={13} className="text-accent" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <div style={css('display:flex;align-items:center;gap:12px')}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label={`Mức suy nghĩ: ${v.thinkLabel}`}
                    className="inline-flex cursor-pointer items-center gap-[5px] whitespace-nowrap border-none bg-transparent text-[11.5px] text-text-2 outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                        className="flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 outline-none data-[highlighted]:bg-black/[0.04]"
                      >
                        <div className="flex-1">
                          <div className="text-[14px] text-text">{label}</div>
                          <div className="text-[11.5px] text-muted">{sub}</div>
                        </div>
                        {check && <Icon n="check" size={13} className="text-accent" />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              {v.showComposerHint && (
                <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--faint);white-space:nowrap")}>
                  {v.activeCount} công cụ · ⏎ gửi
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
