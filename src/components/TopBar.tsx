import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as HoverCard from '@radix-ui/react-hover-card'
import { useStore } from '../state/store'
import { Icon } from './Icon'

const menuContent =
  'z-40 min-w-[18rem] max-w-[92vw] overflow-hidden rounded-[14px] border border-border bg-panel p-0 shadow-overlay ' +
  'animate-[fadeUp_140ms_var(--ease-paper)] origin-top'
const menuItem =
  'flex cursor-pointer select-none items-start gap-[11px] px-4 py-[11px] text-[15px] outline-none data-[highlighted]:bg-black/[0.035]'

export function TopBar() {
  const { v } = useStore()
  if (!v.notQuiet) return null
  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between gap-2.5 border-b border-border bg-bg px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {v.isMobile && (
          <button
            type="button"
            aria-label="Mở menu"
            onClick={v.openDrawer}
            className="tap flex cursor-pointer border-none bg-transparent pr-0.5 text-text-2"
          >
            <Icon n="menu" size={19} />
          </button>
        )}
        <button
          type="button"
          onClick={v.goProjectCfg}
          className="flex min-w-0 cursor-pointer items-center gap-2 border-none bg-transparent font-[inherit]"
        >
          <span className="size-[9px] flex-shrink-0 rounded-[3px] bg-accent" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] text-text">
            {v.headerTitle}
          </span>
          <Icon n="caret" size={14} className="text-faint" />
        </button>
      </div>

      <div className="flex flex-shrink-0 items-center gap-[9px]">
        {v.showMeter && (
          <>
            <HoverCard.Root openDelay={120} closeDelay={80}>
              <HoverCard.Trigger asChild>
                <button
                  type="button"
                  aria-label={`${v.meterLabel} — ${v.tokenDetail}`}
                  className="flex cursor-help items-center gap-2 border-none bg-transparent p-0 font-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  <span className="font-mono text-[11px] text-faint">{v.meterLabel}</span>
                  <div className="h-[5px] w-[84px] overflow-hidden rounded-[3px] bg-border">
                    <div
                      className="h-full bg-accent transition-[width] duration-500"
                      style={{ width: v.tokenPct }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-muted">{v.tokenLabel}</span>
                </button>
              </HoverCard.Trigger>
              <HoverCard.Portal>
                <HoverCard.Content
                  align="end"
                  sideOffset={10}
                  className="z-40 rounded-[10px] border border-border bg-panel px-3 py-2 font-mono text-[11.5px] text-text shadow-overlay animate-[fadeUp_140ms_var(--ease-paper)]"
                >
                  {v.tokenDetail}
                </HoverCard.Content>
              </HoverCard.Portal>
            </HoverCard.Root>
            <span className="h-[18px] w-px bg-border" />
          </>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Chế độ trả lời: ${v.modelLabel}`}
              className="flex cursor-pointer items-center gap-[7px] rounded-[9px] border border-border bg-panel px-[11px] py-[7px] text-[13px] text-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="size-1.5 rounded-full bg-accent" />
              <span className="whitespace-nowrap">{v.modelLabel}</span>
              <Icon n="caret" size={13} className="text-faint" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={menuContent}>
              <div className="px-4 pb-[7px] pt-[13px] font-mono text-[10px] tracking-[0.14em] text-faint">
                {v.modelMenuLabel}
              </div>
              <DropdownMenu.Item onSelect={v.pickOpus} className={menuItem}>
                <span className="mt-1.5 size-[7px] rounded-full bg-accent" />
                <div className="flex-1">
                  <div className="text-[15px] text-text">{v.modelAMode}</div>
                  <div className="text-[13px] text-muted">{v.modelADesc}</div>
                </div>
                {v.checkA && <Icon n="check" size={14} className="mt-1 text-accent" />}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={v.pickHaiku}
                className={`${menuItem} border-t border-border`}
              >
                <span className="mt-1.5 size-[7px] rounded-full bg-border" />
                <div className="flex-1">
                  <div className="text-[15px] text-text">{v.modelBMode}</div>
                  <div className="text-[13px] text-muted">{v.modelBDesc}</div>
                </div>
                {v.checkB && <Icon n="check" size={14} className="mt-1 text-accent" />}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={v.pSettings}
                className="flex cursor-pointer select-none items-center gap-2 border-t border-border px-4 py-3 text-[13px] text-muted outline-none data-[highlighted]:bg-black/[0.035]"
              >
                <Icon n="settings" size={14} /> Đổi nhà cung cấp →
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          type="button"
          aria-label="Vào chế độ tập trung"
          onClick={v.enterQuiet}
          className="flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-border bg-panel px-[11px] py-[7px] font-[inherit] text-[13px] text-text-2"
        >
          <Icon n="focus" size={15} />
          {v.isDesktop && <span className="whitespace-nowrap">Tập trung</span>}
        </button>
      </div>
    </div>
  )
}
