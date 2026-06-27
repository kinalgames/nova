import { useRef } from 'react'
import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'
import type { StagedFile } from '../state/types'

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
            <div style={css('position:relative;flex-shrink:0')}>
              <button type="button" aria-label="Thêm vào chat" onClick={v.toggleCapMenu} className="tap" style={css('background:transparent;border:none;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted)')}>
                <Icon n="plus" size={20} />
              </button>
              {/* hidden real file inputs */}
              <input ref={imgInput} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: 'none' }} />
              <input ref={fileInput} type="file" multiple onChange={onFiles} style={{ display: 'none' }} />
              {v.capMenu && (
                <>
                  <div onClick={v.toggleCapMenu} style={css('position:fixed;inset:0;z-index:7')} />
                  <div style={css('position:absolute;bottom:calc(100% + 8px);left:0;width:300px;max-width:78vw;background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-pop);padding:7px;animation:fadeUp .14s ease;z-index:8;max-height:60vh;overflow-y:auto')}>
                    <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:8px 12px 5px")}>THÊM VÀO CHAT</div>
                    <div onClick={() => imgInput.current?.click()} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css('width:26px;height:26px;border-radius:7px;background:var(--fill);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="image" size={15} /></span>
                      <div style={css('flex:1')}><div style={css('font-size:14px')}>Tải ảnh lên</div></div>
                    </div>
                    <div onClick={() => fileInput.current?.click()} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css('width:26px;height:26px;border-radius:7px;background:var(--border);color:var(--text-2);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="file" size={15} /></span>
                      <div style={css('flex:1')}><div style={css('font-size:14px')}>Tải tệp lên</div><div style={css('font-size:11.5px;color:var(--muted)')}>PDF, tài liệu, mã, bảng tính</div></div>
                    </div>
                    <div onClick={v.goProjects} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css('width:26px;height:26px;border-radius:7px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="folder" size={15} /></span>
                      <div style={css('flex:1')}><div style={css('font-size:14px')}>Thêm từ dự án</div><div style={css('font-size:11.5px;color:var(--muted)')}>Tài liệu trong Aurora</div></div>
                    </div>
                    <div onClick={v.openLightbox} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css('width:26px;height:26px;border-radius:7px;background:var(--border);color:var(--text-2);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="expand" size={15} /></span>
                      <div style={css('flex:1')}><div style={css('font-size:14px')}>Chụp màn hình</div></div>
                    </div>
                    <div style={css('height:1px;background:var(--border);margin:5px 8px')} />
                    <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:6px 12px 5px")}>CÔNG CỤ CỦA NOVA</div>
                    <div onClick={v.toggle_web} data-hover="soft2" style={css('display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css(`width:20px;display:flex;justify-content:center;color:${v.webRowFg}`)}><Icon n="search" size={16} /></span>
                      <span style={css(`flex:1;font-size:14px;color:${v.webRowFg}`)}>Tra cứu web</span>
                      <span style={css('color:var(--accent);font-size:13px')}>{v.webCheck}</span>
                    </div>
                    <div onClick={v.toggle_fetch} data-hover="soft2" style={css('display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css(`width:20px;display:flex;justify-content:center;color:${v.fetchRowFg}`)}><Icon n="fetch" size={16} /></span>
                      <span style={css(`flex:1;font-size:14px;color:${v.fetchRowFg}`)}>Đọc trang web</span>
                      <span style={css('color:var(--accent);font-size:13px')}>{v.fetchCheck}</span>
                    </div>
                    <div onClick={v.toggle_files} data-hover="soft2" style={css('display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css(`width:20px;display:flex;justify-content:center;color:${v.filesRowFg}`)}><Icon n="file" size={16} /></span>
                      <span style={css(`flex:1;font-size:14px;color:${v.filesRowFg}`)}>Tài liệu của bạn</span>
                      <span style={css('color:var(--accent);font-size:13px')}>{v.filesCheck}</span>
                    </div>
                    <div onClick={v.toggle_bash} data-hover="soft2" style={css('display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:9px;cursor:pointer')}>
                      <span style={css(`width:20px;display:flex;justify-content:center;color:${v.bashRowFg}`)}><Icon n="terminal" size={16} /></span>
                      <span style={css(`flex:1;font-size:14px;color:${v.bashRowFg}`)}>{v.bashLabel}</span>
                      <span style={css('color:var(--accent);font-size:13px')}>{v.bashCheck}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <input
              value={v.draft}
              onChange={v.onDraft}
              onKeyDown={v.onKey}
              placeholder="Trả lời Nova…"
              style={css('flex:1;min-width:0;font-size:17px;color:var(--text);padding:9px 0')}
            />
            <button type="button" aria-label="Gửi" onClick={v.send} className="tap" style={css('border:none;width:36px;height:36px;flex-shrink:0;border-radius:10px;background:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--bg)')}>
              <Icon n="send" size={17} stroke={2} />
            </button>
          </div>

          {/* context row */}
          <div style={css('display:flex;align-items:center;justify-content:space-between;padding:8px 4px 2px')}>
            <div style={css('position:relative')}>
              <div onClick={v.toggleProjPicker} style={css('display:flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:8px;padding:5px 9px;cursor:pointer;font-size:12.5px;color:var(--text-2);background:var(--bg)')}>
                <span style={css('width:8px;height:8px;border-radius:2px;background:var(--accent)')} />
                {v.chatProject}
                <Icon n="caret" size={12} style={{ color: 'var(--faint)' }} />
              </div>
              {v.projPicker && (
                <>
                  <div onClick={v.toggleProjPicker} style={css('position:fixed;inset:0;z-index:7')} />
                  <div style={css('position:absolute;bottom:calc(100% + 8px);left:0;width:240px;max-width:78vw;background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-pop);padding:8px;animation:fadeUp .14s ease;z-index:8')}>
                    <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);padding:7px 10px 5px")}>CHAT TRONG DỰ ÁN</div>
                    {v.pickProjects.map((pp, i) => (
                      <div key={i} onClick={pp.pick} style={css(`display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer;background:${pp.bg}`)}>
                        <span style={css(`width:9px;height:9px;border-radius:3px;background:${pp.dot}`)} />
                        <span style={css('flex:1;font-size:14px')}>{pp.name}</span>
                        <span style={css('font-size:11px;color:var(--accent)')}>{pp.check}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={css('display:flex;align-items:center;gap:12px')}>
              <div style={css('position:relative')}>
                <span onClick={v.toggleThinkMenu} data-hover="text" style={css('display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-2);cursor:pointer;white-space:nowrap')}>
                  <Icon n="think" size={13} /> Suy nghĩ: {v.thinkLabel} <Icon n="caret" size={12} style={{ color: 'var(--faint)' }} />
                </span>
                {v.thinkMenu && (
                  <>
                    <div onClick={v.toggleThinkMenu} style={css('position:fixed;inset:0;z-index:7')} />
                    <div style={css('position:absolute;bottom:calc(100% + 8px);right:0;width:220px;max-width:78vw;background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-pop);padding:7px;animation:fadeUp .14s ease;z-index:8')}>
                      <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:7px 10px 5px")}>CHẾ ĐỘ SUY NGHĨ</div>
                      <div onClick={v.setThinkOff} data-hover="soft2" style={css('display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer')}>
                        <div style={css('flex:1')}><div style={css('font-size:14px')}>Tắt</div><div style={css('font-size:11.5px;color:var(--muted)')}>Trả lời ngay</div></div>
                        <span style={css('color:var(--accent);font-size:13px')}>{v.thinkChkOff}</span>
                      </div>
                      <div onClick={v.setThinkLow} data-hover="soft2" style={css('display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer')}>
                        <div style={css('flex:1')}><div style={css('font-size:14px')}>Thấp</div><div style={css('font-size:11.5px;color:var(--muted)')}>Cân nhắc nhanh</div></div>
                        <span style={css('color:var(--accent);font-size:13px')}>{v.thinkChkLow}</span>
                      </div>
                      <div onClick={v.setThinkNormal} data-hover="soft2" style={css('display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer')}>
                        <div style={css('flex:1')}><div style={css('font-size:14px')}>Vừa</div><div style={css('font-size:11.5px;color:var(--muted)')}>Cân bằng — khuyên dùng</div></div>
                        <span style={css('color:var(--accent);font-size:13px')}>{v.thinkChkNormal}</span>
                      </div>
                      <div onClick={v.setThinkHigh} data-hover="soft2" style={css('display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer')}>
                        <div style={css('flex:1')}><div style={css('font-size:14px')}>Cao</div><div style={css('font-size:11.5px;color:var(--muted)')}>Suy luận sâu, chậm hơn</div></div>
                        <span style={css('color:var(--accent);font-size:13px')}>{v.thinkChkHigh}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
