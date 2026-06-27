import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'

export function QuietMode() {
  const { v } = useStore()
  if (!v.quiet) return null
  return (
    <div style={css('position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;flex-direction:column;animation:dim .35s ease')}>
      <div style={css('position:absolute;inset:0;box-shadow:inset 0 0 200px var(--accent-soft);pointer-events:none')} />
      <div style={css('height:64px;display:flex;align-items:center;justify-content:center;gap:10px')}>
        <span style={css('width:6px;height:6px;border-radius:50%;background:var(--accent);animation:breathe 3s ease-in-out infinite')} />
        <span style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;color:var(--muted)")}>TẬP TRUNG · {v.quietClock}</span>
      </div>
      <div style={css('flex:1;min-height:0;overflow-y:auto;display:flex;justify-content:center')}>
        <div style={css('width:620px;max-width:100%;padding:30px 22px')}>
          <div style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:var(--muted);margin-bottom:10px")}>MINH</div>
          <div style={css('font-size:18px;line-height:1.6')}>
            Viết phần <em>Rủi ro</em> cho kế hoạch — gọn, có cách giảm thiểu.
          </div>
          <div style={css('height:26px')} />
          <div style={css('display:flex;align-items:center;gap:9px;margin-bottom:12px')}>
            <span style={css('width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center')}><Icon n="nova" size={13} /></span>
            <span style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:var(--accent)")}>NOVA</span>
          </div>
          <div style={css('font-size:18px;line-height:1.75')}>
            Bốn rủi ro lớn nhất và cách giảm thiểu:
            <br />
            <br />
            1 · <b style={css('font-weight:600')}>Thông điệp loãng.</b> Chốt một câu định vị duy nhất.
            <br />
            2 · <b style={css('font-weight:600')}>Trễ nội dung.</b> Duyệt theo lô, deadline cứng.
            <br />
            3 · <b style={css('font-weight:600')}>Kênh phân tán.</b> Chọn đúng hai kênh.
            <br />
            4 · <b style={css('font-weight:600')}>Đo lường mơ hồ.</b> Định nghĩa "kích hoạt" trước.
          </div>
        </div>
      </div>
      <div style={css('min-height:80px;display:flex;align-items:center;justify-content:center;padding:14px 22px')}>
        <div style={css('width:620px;max-width:100%;display:flex;align-items:center;gap:12px;opacity:.85')}>
          <input placeholder="Tiếp tục trong im lặng…" style={css('flex:1;min-width:0;font-size:17px;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:8px')} />
          <button type="button" onClick={v.exitQuiet} style={css('font-size:12.5px;color:var(--muted);border:1px solid var(--border);border-radius:9px;padding:8px 13px;cursor:pointer;flex-shrink:0;background:transparent;text-align:left;font:inherit')}>
            Thoát
          </button>
        </div>
      </div>
    </div>
  )
}
