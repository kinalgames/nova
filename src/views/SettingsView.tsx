import { useStore } from '../state/store'
import { css } from '../css'
import { ToggleRow } from '../components/ToggleRow'
import { Icon } from '../components/Icon'

export function SettingsView() {
  const { v } = useStore()
  if (!v.isSettings) return null
  return (
    <div className="view" style={css('position:absolute;inset:0;overflow-y:auto;display:flex;justify-content:center')}>
      <div style={css(`width:640px;max-width:100%;padding:${v.pagePad}`)}>
        <div style={css(`font-family:var(--font-display);font-size:${v.pageTitle};letter-spacing:-.01em;margin-bottom:28px`)}>Cài đặt</div>

        {/* advanced mode card */}
        <div style={css(`border:1px solid ${v.advBorder};background:${v.advBg};border-radius:14px;padding:16px 17px;margin-bottom:30px`)}>
          <div style={css('display:flex;align-items:center;gap:13px')}>
            <span style={css('width:36px;height:36px;border-radius:10px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="command" size={17} /></span>
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:16px;font-weight:500')}>Chế độ nâng cao</div>
              <div style={css('font-size:13px;color:var(--muted);margin-top:2px;line-height:1.45')}>Hé lộ chi tiết kỹ thuật trong cùng giao diện: tên công cụ, token, nhà cung cấp &amp; API, system prompt, phím tắt.</div>
            </div>
            <div onClick={v.toggleAdvanced} style={css(`width:44px;height:25px;border-radius:13px;background:${v.advTrackBg};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0`)}>
              <div style={css(`position:absolute;left:2px;top:2px;width:21px;height:21px;border-radius:50%;background:var(--knob);transform:${v.advKnobTx};transition:transform .2s;box-shadow:var(--knob-shadow)`)} />
            </div>
          </div>
        </div>

        {/* providers */}
        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:11px")}>NOVA DÙNG MÔ HÌNH</div>
        <div style={css('display:flex;flex-direction:column;gap:10px;margin-bottom:12px')}>
          {v.providers.map((pr) => (
            <div key={pr.id} onClick={pr.select} style={css(`border:1px solid ${pr.border};background:${pr.bg};border-radius:13px;padding:14px 16px;cursor:pointer`)}>
              <div style={css('display:flex;align-items:center;gap:13px')}>
                <div style={css(`width:36px;height:36px;border-radius:10px;background:${pr.badgeBg};color:${pr.badgeFg};display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:15px;flex-shrink:0`)}>
                  {pr.glyph}
                </div>
                <div style={css('flex:1;min-width:0')}>
                  <div style={css('font-size:16px')}>{pr.name} {pr.rec}</div>
                  <div style={css('font-size:13px;color:var(--muted)')}>{pr.sub}</div>
                </div>
                <span style={css(`font-family:var(--font-mono);font-size:10.5px;color:${pr.statusFg};background:${pr.statusBg};border-radius:6px;padding:4px 9px;white-space:nowrap`)}>
                  {pr.badge}
                </span>
                <span style={css(`width:18px;height:18px;border-radius:50%;border:2px solid ${pr.radioBd};background:${pr.radioBg};flex-shrink:0;display:flex;align-items:center;justify-content:center`)}>
                  <span style={css(`width:7px;height:7px;border-radius:50%;background:${pr.radioDot}`)} />
                </span>
              </div>
              {pr.showKey && (
                <div style={css('margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:12px')}>
                  <div>
                    <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;color:var(--faint);margin-bottom:7px")}>{pr.fieldLabel}</div>
                    <div style={css('display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:9px;padding:10px 12px;background:var(--panel)')}>
                      <span style={css("font-family:var(--font-mono);font-size:13px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{pr.fieldValue}</span>
                      <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--accent);cursor:pointer")}>{pr.fieldAction}</span>
                    </div>
                  </div>
                  <div>
                    <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;color:var(--faint);margin-bottom:8px")}>MÔ HÌNH KHẢ DỤNG</div>
                    <div style={css('display:flex;flex-wrap:wrap;gap:7px')}>
                      {pr.models.map((md, i) => (
                        <span key={i} style={css(`font-family:var(--font-mono);font-size:11.5px;color:${md.fg};background:${md.bg};border:1px solid ${md.bd};border-radius:7px;padding:5px 10px`)}>
                          {md.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {v.advanced && (
          <div style={css('display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--faint);margin-bottom:30px;cursor:pointer')}><Icon n="plus" size={13} /> Thêm nhà cung cấp tùy chỉnh (OpenAI‑compatible)</div>
        )}
        {v.simpleMode && <div style={css('height:18px')} />}

        {/* appearance */}
        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:6px")}>GIAO DIỆN</div>
        <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;border-bottom:1px solid var(--border)')}>
          <span style={css('font-size:16px')}>Giao diện</span>
          <div style={css('display:flex;gap:6px;flex-shrink:0')}>
            <span onClick={v.setLight} style={css(`border:1px solid ${v.themeLightBd};background:${v.themeLightBg};color:${v.themeLightFg};border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer`)}>Sáng</span>
            <span onClick={v.setDark} style={css(`border:1px solid ${v.themeDarkBd};background:${v.themeDarkBg};color:${v.themeDarkFg};border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer`)}>Tối</span>
            <span onClick={v.setAuto} style={css(`border:1px solid ${v.themeAutoBd};background:${v.themeAutoBg};color:${v.themeAutoFg};border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer`)}>Tự động</span>
          </div>
        </div>
        {v.advanced && (
          <ToggleRow
            title="Thanh phím tắt dưới cùng"
            sub="Hiện gợi ý phím tắt (chỉ desktop)"
            on={v.barOn}
            accent={v.accent}
            onToggle={v.toggleBar}
          />
        )}

        {/* focus */}
        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin:22px 0 6px")}>CHẾ ĐỘ TẬP TRUNG</div>
        <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;border-bottom:1px solid var(--border)')}>
          <span style={css('font-size:16px')}>Thời lượng phiên</span>
          <div style={css('display:flex;gap:6px;flex-shrink:0')}>
            <span onClick={v.setF15} style={css(`border:1px solid ${v.f15Bd};background:${v.f15Bg};color:${v.f15Fg};border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer`)}>15′</span>
            <span onClick={v.setF25} style={css(`border:1px solid ${v.f25Bd};background:${v.f25Bg};color:${v.f25Fg};border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer`)}>25′</span>
            <span onClick={v.setF50} style={css(`border:1px solid ${v.f50Bd};background:${v.f50Bg};color:${v.f50Fg};border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer`)}>50′</span>
          </div>
        </div>

        {/* account */}
        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin:22px 0 6px")}>TÀI KHOẢN</div>
        <div style={css('display:flex;align-items:center;gap:13px;padding:14px 2px')}>
          <div style={css('width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#E0A06B,var(--accent));flex-shrink:0')} />
          <div style={css('flex:1;min-width:0')}>
            <div style={css('font-size:16px')}>Minh Trần</div>
            <div style={css('font-size:13px;color:var(--muted)')}>minh@aurora.studio · Gói Pro</div>
          </div>
          <span onClick={v.logout} style={css('font-size:13px;color:var(--faint);cursor:pointer')}>Quản lý</span>
        </div>
      </div>
    </div>
  )
}
