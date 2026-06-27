import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'

export function MobileDrawer() {
  const { v } = useStore()
  if (!v.drawerOpen) return null
  return (
    <>
      <div onClick={v.closeDrawer} style={css('position:fixed;inset:0;background:rgba(27,26,22,.28);z-index:48;animation:dim .12s ease')} />
      <aside style={css('position:fixed;top:0;left:0;bottom:0;width:282px;max-width:84vw;z-index:49;background:var(--side);display:flex;flex-direction:column;animation:slideR .2s ease;overflow:hidden')}>
        <div style={css('height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 14px 0 18px')}>
          <div style={css('display:flex;align-items:center;gap:9px')}>
            <div style={css('width:13px;height:13px;border-radius:50%;background:var(--ink);box-shadow:inset -3px -3px 0 var(--side)')} />
            <span style={css("font-family:var(--font-display);font-size:21px")}>Lumen</span>
          </div>
          <button type="button" aria-label="Đóng" onClick={v.closeDrawer} className="tap" style={css('background:transparent;border:none;cursor:pointer;color:var(--muted);display:flex')}><Icon n="close" size={17} /></button>
        </div>
        <div style={css('padding:0 12px;display:flex;flex-direction:column;gap:6px')}>
          <div onClick={v.pNewChat} style={css('display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;background:var(--panel);border:1px solid var(--border);cursor:pointer;font-size:14px')}>
            <Icon n="plus" size={17} /><span>Cuộc trò chuyện mới</span>
          </div>
          <div onClick={v.togglePalette} style={css('display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:14px;color:var(--muted)')}>
            <Icon n="search" size={17} /><span>Tìm</span>
          </div>
        </div>
        <div style={css('flex:1;min-height:0;overflow-y:auto;padding:14px 12px 8px')}>
          <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:0 8px 8px")}>DỰ ÁN</div>
          {v.sideProjects.map((p, i) => (
            <div key={i} onClick={p.open} style={css(`display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer;background:${p.bg}`)}>
              <span style={css(`width:9px;height:9px;border-radius:3px;background:${p.dot}`)} />
              <span style={css(`flex:1;font-size:14px;color:${p.fg}`)}>{p.name}</span>
            </div>
          ))}
          <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:18px 8px 8px")}>GẦN ĐÂY · AURORA</div>
          {v.sideConvs.map((c, i) => (
            <div key={i} onClick={c.open} style={css(`display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:9px;cursor:pointer;background:${c.bg}`)}>
              <span style={css(`width:5px;height:5px;border-radius:50%;background:${c.dot}`)} />
              <span style={css(`flex:1;font-size:13.5px;color:${c.fg}`)}>{c.title}</span>
            </div>
          ))}
        </div>
        <div style={css('flex-shrink:0;padding:8px 12px 14px;border-top:1px solid var(--border)')}>
          <div onClick={v.goAssistant} style={css(`display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer;font-size:14px;color:${v.novaFg}`)}>
            <Icon n="nova" size={16} /><span>Nova</span>
          </div>
          <div onClick={v.goSettings} style={css(`display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer;font-size:14px;color:${v.setFg}`)}>
            <Icon n="settings" size={16} /><span>Cài đặt</span>
          </div>
        </div>
      </aside>
    </>
  )
}
