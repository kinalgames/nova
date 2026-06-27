import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './../components/Icon'

export function HomeView() {
  const { v } = useStore()
  if (!v.isHome) return null
  return (
    <div style={css('position:absolute;inset:0;overflow-y:auto;display:flex;justify-content:center')}>
      <div style={css(`width:640px;max-width:100%;padding:${v.homePad};display:flex;flex-direction:column;align-items:center;min-height:100%;justify-content:center`)}>
        <div style={css(`font-family:var(--font-display);font-size:${v.heroSize};line-height:1.04;letter-spacing:-.01em;text-align:center`)}>
          Chào buổi chiều, Minh.
        </div>
        <div style={css('font-size:17px;color:var(--muted);margin-top:12px;text-align:center')}>
          Mình là Nova. Bạn muốn làm gì hôm nay?
        </div>
        <div style={css('width:100%;margin-top:34px;border:1px solid var(--border);border-radius:16px;background:var(--panel);padding:15px 16px;display:flex;align-items:center;gap:12px')}>
          <input
            value={v.draft}
            onChange={v.onDraft}
            onKeyDown={v.onKey}
            placeholder="Nhắn cho Nova…"
            style={css('flex:1;min-width:0;font-size:18px;color:var(--text)')}
          />
          <div onClick={v.send} style={css('width:36px;height:36px;flex-shrink:0;border-radius:10px;background:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--bg)')}>
            <Icon n="send" size={17} stroke={2} />
          </div>
        </div>
        <div style={css(`width:100%;margin-top:14px;display:grid;grid-template-columns:${v.sugCols};gap:10px`)}>
          {v.suggestions.map((g, i) => (
            <div key={i} onClick={g.go} data-hover="border" style={css('border:1px solid var(--border);border-radius:13px;background:var(--panel);padding:14px 15px;cursor:pointer')}>
              <div style={css('display:flex;align-items:center;gap:9px')}>
                <span style={css(`width:26px;height:26px;border-radius:8px;background:${g.bg};color:${g.fg};display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>
                  <Icon n={g.glyph} size={15} />
                </span>
                <span style={css('font-size:15px;font-weight:500')}>{g.title}</span>
              </div>
              <div style={css('font-size:13px;color:var(--muted);margin-top:8px;line-height:1.45')}>{g.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
