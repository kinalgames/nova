import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'

export function TopBar() {
  const { v } = useStore()
  if (!v.notQuiet) return null
  return (
    <div style={css('height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border);background:var(--bg);gap:10px')}>
      <div style={css('display:flex;align-items:center;gap:10px;min-width:0')}>
        {v.isMobile && (
          <button type="button" aria-label="Mở menu" onClick={v.openDrawer} className="tap" style={css('background:transparent;border:none;cursor:pointer;color:var(--text-2);padding-right:2px;display:flex')}>
            <Icon n="menu" size={19} />
          </button>
        )}
        <div onClick={v.goProjectCfg} style={css('display:flex;align-items:center;gap:8px;cursor:pointer;min-width:0')}>
          <span style={css('width:9px;height:9px;border-radius:3px;background:var(--accent);flex-shrink:0')} />
          <span style={css('font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{v.headerTitle}</span>
          <Icon n="caret" size={14} style={{ color: 'var(--faint)' }} />
        </div>
      </div>
      <div style={css('display:flex;align-items:center;gap:9px;flex-shrink:0')}>
        {v.showMeter && (
          <>
            <div style={css('display:flex;align-items:center;gap:8px')}>
              <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--faint)")}>{v.meterLabel}</span>
              <div style={css('width:84px;height:5px;border-radius:3px;background:var(--border);overflow:hidden')}>
                <div style={css(`width:${v.tokenPct};height:100%;background:var(--accent);transition:width .5s`)} />
              </div>
              <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--muted)")}>{v.tokenLabel}</span>
            </div>
            <span style={css('width:1px;height:18px;background:var(--border)')} />
          </>
        )}
        <div onClick={v.toggleModelMenu} style={css('display:flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:9px;padding:7px 11px;cursor:pointer;font-size:13px;background:var(--panel)')}>
          <span style={css('width:6px;height:6px;border-radius:50%;background:var(--accent)')} />
          <span style={css('white-space:nowrap')}>{v.modelLabel}</span>
          <Icon n="caret" size={13} style={{ color: 'var(--faint)' }} />
        </div>
        <button type="button" aria-label="Vào chế độ tập trung" onClick={v.enterQuiet} style={css('display:flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:9px;padding:7px 11px;cursor:pointer;font-size:13px;color:var(--text-2);background:var(--panel);font-family:inherit')}>
          <Icon n="focus" size={15} />
          {v.isDesktop && <span style={css('white-space:nowrap')}>Tập trung</span>}
        </button>
      </div>
    </div>
  )
}

export function ModelMenu() {
  const { v } = useStore()
  if (!v.modelMenu) return null
  return (
    <>
      <div onClick={v.closeMenus} style={css('position:fixed;inset:0;z-index:30')} />
      <div style={css('position:absolute;top:56px;right:16px;z-index:31;width:290px;max-width:92vw;background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-overlay);overflow:hidden;animation:fadeUp .14s ease')}>
        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);padding:13px 16px 7px")}>
          {v.modelMenuLabel}
        </div>
        <div onClick={v.pickOpus} style={css('display:flex;align-items:flex-start;gap:11px;padding:11px 16px;cursor:pointer')}>
          <span style={css('width:7px;height:7px;border-radius:50%;background:var(--accent);margin-top:6px')} />
          <div style={css('flex:1')}>
            <div style={css('font-size:15px')}>{v.modelAMode}</div>
            <div style={css('font-size:13px;color:var(--muted)')}>{v.modelADesc}</div>
          </div>
          <span style={css("font-family:var(--font-mono);font-size:12px;color:var(--accent)")}>{v.checkA}</span>
        </div>
        <div onClick={v.pickHaiku} style={css('display:flex;align-items:flex-start;gap:11px;padding:11px 16px;cursor:pointer;border-top:1px solid var(--border)')}>
          <span style={css('width:7px;height:7px;border-radius:50%;background:var(--border);margin-top:6px')} />
          <div style={css('flex:1')}>
            <div style={css('font-size:15px')}>{v.modelBMode}</div>
            <div style={css('font-size:13px;color:var(--muted)')}>{v.modelBDesc}</div>
          </div>
          <span style={css("font-family:var(--font-mono);font-size:12px;color:var(--accent)")}>{v.checkB}</span>
        </div>
        <div onClick={v.pSettings} style={css('display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border);font-size:13px;color:var(--muted);cursor:pointer')}>
          <Icon n="settings" size={14} /> Đổi nhà cung cấp →
        </div>
      </div>
    </>
  )
}
