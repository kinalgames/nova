import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './../components/Icon'

export function ProjectsView() {
  const { v } = useStore()
  if (!v.isProjects) return null
  return (
    <div className="view" style={css('position:absolute;inset:0;overflow-y:auto;display:flex;justify-content:center')}>
      <div style={css(`width:720px;max-width:100%;padding:${v.pagePad}`)}>
        <div style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:8px')}>
          <div style={css(`font-family:var(--font-display);font-size:${v.pageTitle};letter-spacing:-.01em`)}>Dự án</div>
          <button type="button" onClick={v.goConv} style={css('display:flex;align-items:center;gap:6px;background:var(--ink);color:var(--bg);border-radius:10px;padding:9px 14px;font-size:13.5px;cursor:pointer;flex-shrink:0;border:none;text-align:left;font:inherit')}>
            <Icon n="plus" size={15} stroke={2} /> Dự án mới
          </button>
        </div>
        <div style={css('font-size:15px;color:var(--muted);margin-bottom:26px')}>Mỗi dự án có hướng dẫn và kỹ năng riêng cho Nova.</div>
        <button type="button" onClick={v.goConv} style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;border:1px solid var(--border);background:var(--panel);border-radius:13px;cursor:pointer;margin-bottom:10px;text-align:left;font:inherit')}>
          <div style={css('display:flex;align-items:center;gap:12px;min-width:0')}>
            <span style={css('width:32px;height:32px;border-radius:9px;background:var(--border);color:var(--text-2);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="inbox" size={16} /></span>
            <div style={css('min-width:0')}>
              <div style={css('font-size:17px;display:flex;align-items:center;gap:8px')}>
                Chung <span style={css('font-size:10.5px;color:var(--text-2);background:var(--fill);border-radius:5px;padding:2px 7px')}>Mặc định</span>
              </div>
              <div style={css('font-size:13px;color:var(--muted);margin-top:2px')}>Cuộc trò chuyện chưa thuộc dự án nào sẽ ở đây.</div>
            </div>
          </div>
          <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--faint);flex-shrink:0")}>31 luồng</span>
        </button>
        {v.projects.map((p, i) => (
          <div key={i} style={css('display:flex;align-items:center;justify-content:space-between;gap:10px;padding:17px 4px;border-bottom:1px solid var(--border)')}>
            <button type="button" onClick={p.open} style={css('display:flex;align-items:center;gap:12px;min-width:0;cursor:pointer;flex:1;background:transparent;border:none;text-align:left;font:inherit')}>
              <span style={css(`width:10px;height:10px;border-radius:3px;background:${p.dot};flex-shrink:0`)} />
              <div style={css('min-width:0')}>
                <div style={css('font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{p.name}</div>
                <div style={css('font-size:13.5px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{p.desc}</div>
              </div>
            </button>
            <div style={css('display:flex;align-items:center;gap:14px;flex-shrink:0')}>
              <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--faint);text-align:right;line-height:1.6")}>
                {p.threads}
                <br />
                {p.when}
              </span>
              <button type="button" aria-label={`Cấu hình ${p.name}`} onClick={p.config} style={css('background:transparent;border:none;color:var(--faint);cursor:pointer;display:flex')}><Icon n="settings" size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
