import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'

export function CommandPalette() {
  const { v } = useStore()
  if (!v.palette) return null
  return (
    <>
      <div onClick={v.closeMenus} style={css('position:fixed;inset:0;background:rgba(27,26,22,.20);z-index:40;animation:dim .12s ease')} />
      <div style={css(`position:fixed;left:50%;top:${v.paletteTop};transform:translateX(-50%);width:560px;max-width:94vw;z-index:41;background:var(--panel);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-overlay);overflow:hidden;animation:fadeUp .15s ease`)}>
        <div style={css('height:58px;display:flex;align-items:center;gap:12px;padding:0 18px;border-bottom:1px solid var(--border)')}>
          <span style={css('color:var(--faint);display:flex')}><Icon n="search" size={18} /></span>
          <input
            autoFocus
            value={v.q}
            onChange={v.onQ}
            placeholder="Tìm trang, dự án, hành động…"
            style={css('flex:1;min-width:0;font-size:17px;color:var(--text)')}
          />
          <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--faint);border:1px solid var(--border);border-radius:5px;padding:2px 6px")}>esc</span>
        </div>
        <div style={css('max-height:52vh;overflow-y:auto;padding:8px')}>
          <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);padding:8px 12px 5px")}>ĐI TỚI</div>
          <div onClick={v.pConvAurora} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer')}>
            <span style={css('width:9px;height:9px;border-radius:3px;background:var(--accent)')} />
            <span style={css('font-size:15px;flex:1')}>Dự án · Aurora</span>
          </div>
          <div onClick={v.pProjects} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer')}>
            <Icon n="file" size={16} style={{ color: 'var(--muted)' }} />
            <span style={css('font-size:15px;flex:1')}>Tất cả dự án</span>
          </div>
          <div onClick={v.pAssistant} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer')}>
            <Icon n="nova" size={16} style={{ color: 'var(--muted)' }} />
            <span style={css('font-size:15px;flex:1')}>Nova · trợ lý</span>
          </div>
          <div onClick={v.pSettings} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer')}>
            <Icon n="settings" size={16} style={{ color: 'var(--muted)' }} />
            <span style={css('font-size:15px;flex:1')}>Cài đặt</span>
          </div>
          <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);padding:12px 12px 5px")}>HÀNH ĐỘNG</div>
          <div onClick={v.pNewChat} data-hover="soft2" style={css('display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer')}>
            <Icon n="plus" size={16} style={{ color: 'var(--muted)' }} />
            <span style={css('font-size:15px;flex:1')}>Cuộc trò chuyện mới</span>
          </div>
          <div onClick={v.pQuiet} style={css('display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer;background:var(--accent-soft)')}>
            <Icon n="focus" size={16} style={{ color: 'var(--accent)' }} />
            <span style={css('font-size:15px;flex:1')}>Vào chế độ tập trung</span>
          </div>
        </div>
      </div>
    </>
  )
}
