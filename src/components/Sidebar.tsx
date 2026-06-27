import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER, MENU_SEP } from './menu'

export function Sidebar() {
  const { v } = useStore()
  if (!v.showSidebar) return null
  return (
    <aside
      style={css(
        `width:${v.sidebarW};flex-shrink:0;background:var(--side);display:flex;flex-direction:column;transition:width .18s ease;overflow:hidden`,
      )}
    >
      {/* brand row */}
      <div style={css('height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 14px 0 18px')}>
        <div onClick={v.goHome} style={css('display:flex;align-items:center;gap:9px;cursor:pointer;min-width:0')}>
          <div style={css('width:13px;height:13px;border-radius:50%;background:var(--ink);box-shadow:inset -3px -3px 0 var(--side);flex-shrink:0')} />
          {v.sidebarExpanded && (
            <span style={css("font-family:var(--font-display);font-size:21px")}>Lumen</span>
          )}
        </div>
        {v.sidebarExpanded && (
          <button type="button" aria-label="Thu gọn thanh bên" onClick={v.collapseSidebar} style={css('background:transparent;border:none;cursor:pointer;color:var(--muted);display:flex')}>
            <Icon n="collapse" size={16} />
          </button>
        )}
      </div>
      {v.sidebarCollapsed && (
        <button type="button" aria-label="Mở thanh bên" onClick={v.collapseSidebar} style={css('background:transparent;border:none;width:100%;display:flex;justify-content:center;padding:0 0 10px;cursor:pointer;color:var(--muted)')}>
          <Icon n="expandRail" size={16} />
        </button>
      )}

      {/* new + search */}
      <div style={css('padding:0 12px;display:flex;flex-direction:column;gap:6px')}>
        <button
          type="button"
          onClick={v.pNewChat}
          style={css(
            `width:100%;display:flex;align-items:center;gap:10px;justify-content:${v.railJustify};padding:9px 12px;border-radius:10px;background:var(--panel);border:1px solid var(--border);cursor:pointer;font-size:14px;color:var(--text)`,
          )}
        >
          <Icon n="plus" size={17} />
          {v.sidebarExpanded && <span style={css('flex:1;text-align:left')}>Cuộc trò chuyện mới</span>}
        </button>
        <button
          type="button"
          onClick={v.togglePalette}
          data-hover="soft"
          style={css(
            `width:100%;border:none;display:flex;align-items:center;gap:10px;justify-content:${v.railJustify};padding:9px 12px;border-radius:10px;cursor:pointer;font-size:14px;color:var(--muted)`,
          )}
        >
          <Icon n="search" size={17} />
          {v.sidebarExpanded && (
            <>
              <span style={css('flex:1;text-align:left')}>Tìm</span>
              <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--faint)")}>⌘K</span>
            </>
          )}
        </button>
      </div>

      {/* lists */}
      <div style={css('flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 12px 8px')}>
        {v.sidebarExpanded && (
          <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:0 8px 8px")}>
            DỰ ÁN
          </div>
        )}
        {v.sideProjects.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={p.open}
            data-hover="soft"
            style={css(
              `width:100%;border:none;display:flex;align-items:center;gap:10px;justify-content:${v.railJustify};padding:8px 10px;border-radius:9px;cursor:pointer;margin-bottom:1px;background:${p.bg}`,
            )}
          >
            <span style={css(`width:9px;height:9px;border-radius:3px;background:${p.dot};flex-shrink:0`)} />
            {v.sidebarExpanded && (
              <>
                <span style={css(`flex:1;text-align:left;font-size:14px;color:${p.fg};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>
                  {p.name}
                </span>
                <span style={css("font-family:var(--font-mono);font-size:10px;color:var(--faint)")}>{p.count}</span>
              </>
            )}
          </button>
        ))}
        {v.sidebarExpanded && (
          <>
            <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;color:var(--label);padding:18px 8px 8px")}>
              GẦN ĐÂY · AURORA
            </div>
            {v.sideConvs.map((c, i) => (
              <div
                key={i}
                data-hover="soft"
                style={css('display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;margin-bottom:1px')}
              >
                <button
                  type="button"
                  onClick={c.open}
                  style={css(`display:flex;flex:1;min-width:0;align-items:center;gap:9px;background:transparent;border:none;cursor:pointer;text-align:left`)}
                >
                  <span style={css(`width:5px;height:5px;border-radius:50%;background:${c.dot};flex-shrink:0`)} />
                  <span style={css(`flex:1;min-width:0;font-size:13.5px;color:${c.fg};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>
                    {c.title}
                  </span>
                </button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Tùy chọn cuộc trò chuyện"
                      className="flex flex-shrink-0 cursor-pointer border-none bg-transparent px-0.5 text-faint outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <Icon n="more" size={15} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="start" sideOffset={4} className={MENU_CONTENT}>
                      <DropdownMenu.Item className={MENU_ITEM}>Đổi tên</DropdownMenu.Item>
                      <DropdownMenu.Item className={MENU_ITEM}>Ghim lên đầu</DropdownMenu.Item>
                      <DropdownMenu.Item className={MENU_ITEM}>Chuyển dự án…</DropdownMenu.Item>
                      <DropdownMenu.Separator className={MENU_SEP} />
                      <DropdownMenu.Item className={MENU_ITEM_DANGER}>Xóa</DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            ))}
          </>
        )}
      </div>

      {/* footer */}
      <div style={css('flex-shrink:0;padding:8px 12px 12px;border-top:1px solid var(--border)')}>
        <button
          type="button"
          onClick={v.goAssistant}
          data-hover="soft"
          style={css(
            `width:100%;border:none;display:flex;align-items:center;gap:10px;justify-content:${v.railJustify};padding:8px 10px;border-radius:9px;cursor:pointer;font-size:14px;color:${v.novaFg};background:${v.novaBg}`,
          )}
        >
          <Icon n="nova" size={16} />
          {v.sidebarExpanded && <span style={css('flex:1;text-align:left')}>Nova</span>}
        </button>
        <button
          type="button"
          onClick={v.goSettings}
          data-hover="soft"
          style={css(
            `width:100%;border:none;display:flex;align-items:center;gap:10px;justify-content:${v.railJustify};padding:8px 10px;border-radius:9px;cursor:pointer;font-size:14px;color:${v.setFg};background:${v.setBg}`,
          )}
        >
          <Icon n="settings" size={16} />
          {v.sidebarExpanded && <span style={css('flex:1;text-align:left')}>Cài đặt</span>}
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Tài khoản — Minh Trần"
              data-hover="soft"
              style={css(`width:100%;border:none;background:transparent;display:flex;align-items:center;gap:10px;justify-content:${v.railJustify};padding:9px 10px;border-radius:9px;cursor:pointer`)}
            >
              <div style={css('width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#E0A06B,var(--accent));flex-shrink:0')} />
              {v.sidebarExpanded && (
                <>
                  <div style={css('flex:1;min-width:0;text-align:left')}>
                    <div style={css('font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>Minh Trần</div>
                  </div>
                  <Icon n="more" size={15} className="text-faint" />
                </>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content side="top" align="start" sideOffset={8} className={MENU_CONTENT}>
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="size-[30px] flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#E0A06B,var(--accent))]" />
                <div className="min-w-0">
                  <div className="text-[13.5px] text-text">Minh Trần</div>
                  <div className="text-[11.5px] text-muted">Gói Pro</div>
                </div>
              </div>
              <DropdownMenu.Separator className={MENU_SEP} />
              <DropdownMenu.Item className={MENU_ITEM} onSelect={v.goSettings}>
                Cài đặt
              </DropdownMenu.Item>
              <DropdownMenu.Item className={MENU_ITEM_DANGER} onSelect={v.logout}>
                Đăng xuất
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </aside>
  )
}
