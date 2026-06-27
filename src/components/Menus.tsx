import { useStore } from '../state/store'
import { css } from '../css'

export function AccountMenu() {
  const { v } = useStore()
  if (!v.accountMenu) return null
  return (
    <>
      <div onClick={v.toggleAccountMenu} style={css('position:fixed;inset:0;z-index:32')} />
      <div style={css('position:fixed;bottom:60px;left:14px;width:212px;z-index:33;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-pop);padding:6px;animation:fadeUp .14s ease')}>
        <div style={css('display:flex;align-items:center;gap:10px;padding:9px 11px')}>
          <div style={css('width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#E0A06B,var(--accent));flex-shrink:0')} />
          <div style={css('min-width:0')}>
            <div style={css('font-size:13.5px')}>Minh Trần</div>
            <div style={css('font-size:11.5px;color:var(--muted)')}>Gói Pro</div>
          </div>
        </div>
        <div style={css('height:1px;background:var(--border);margin:4px 6px')} />
        <div onClick={v.goSettings} data-hover="soft2" style={css('padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px')}>
          Cài đặt
        </div>
        <div onClick={v.logout} data-hover="soft2" style={css('padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px;color:var(--danger)')}>
          Đăng xuất
        </div>
      </div>
    </>
  )
}

export function ConvMenu() {
  const { v } = useStore()
  if (!v.convMenu) return null
  return (
    <>
      <div onClick={v.closeConvMenu} style={css('position:fixed;inset:0;z-index:34')} />
      <div style={css('position:fixed;left:236px;top:330px;width:204px;z-index:35;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-pop);padding:6px;animation:fadeUp .14s ease')}>
        <div onClick={v.closeConvMenu} data-hover="soft2" style={css('padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px')}>
          Đổi tên
        </div>
        <div onClick={v.closeConvMenu} data-hover="soft2" style={css('padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px')}>
          Ghim lên đầu
        </div>
        <div onClick={v.closeConvMenu} data-hover="soft2" style={css('padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px')}>
          Chuyển dự án…
        </div>
        <div style={css('height:1px;background:var(--border);margin:4px 6px')} />
        <div onClick={v.closeConvMenu} data-hover="soft2" style={css('padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px;color:var(--danger)')}>
          Xóa
        </div>
      </div>
    </>
  )
}
