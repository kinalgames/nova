import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as HoverCard from '@radix-ui/react-hover-card'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { ProviderLogo } from './ProviderLogo'

const menuContent =
  'z-40 min-w-[18rem] max-w-[92vw] overflow-hidden rounded-md border border-border bg-panel p-0 shadow-overlay ' +
  'animate-[fadeUp_140ms_var(--ease-paper)] origin-top'
const menuItem =
  'flex cursor-pointer select-none items-start gap-3 px-4 py-3 text-body outline-none data-[highlighted]:bg-hover-1'

export function TopBar() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.notQuiet) return null
  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between gap-2.5 border-b border-border bg-bg px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {v.isMobile && (
          <button
            type="button"
            aria-label={t('nav.openMenu')}
            onClick={v.openDrawer}
            className="tap flex cursor-pointer border-none bg-transparent pr-0.5 text-text-2"
          >
            <Icon n="menu" size={19} />
          </button>
        )}
        <button
          type="button"
          onClick={v.goProject}
          className="flex min-w-0 cursor-pointer items-center gap-2 border-none bg-transparent font-[inherit]"
        >
          <span className="size-[9px] flex-shrink-0 rounded-xs bg-accent" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-body text-text">
            {v.headerTitle}
          </span>
          <Icon n="caret" size={14} className="text-faint" />
        </button>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {v.isDemo && (
          <span className="flex items-center gap-2 whitespace-nowrap rounded-xs bg-warn-bg px-2 py-1 font-mono text-eyebrow text-warn-text">
            <span>{t('demo.badge')}</span>
            <button
              type="button"
              onClick={v.exitDemo}
              className="cursor-pointer border-none bg-transparent p-0 font-mono text-eyebrow text-warn-text underline underline-offset-2"
            >
              {t('demo.exit')}
            </button>
          </span>
        )}
        {v.showMeter && (
          <>
            <HoverCard.Root openDelay={120} closeDelay={80}>
              <HoverCard.Trigger asChild>
                <button
                  type="button"
                  aria-label={`${v.meterLabel} — ${v.tokenDetail}`}
                  className="flex cursor-help items-center gap-2 border-none bg-transparent p-0 font-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  <span className="font-mono text-eyebrow text-faint">{v.meterLabel}</span>
                  <div className="h-[5px] w-[84px] overflow-hidden rounded-xs bg-border">
                    <div
                      className="h-full bg-accent transition-[width] duration-500"
                      style={{ width: v.tokenPct }}
                    />
                  </div>
                  <span className="font-mono text-eyebrow text-muted">{v.tokenLabel}</span>
                </button>
              </HoverCard.Trigger>
              <HoverCard.Portal>
                <HoverCard.Content
                  align="end"
                  sideOffset={10}
                  className="z-40 rounded-sm border border-border bg-panel px-3 py-2 font-mono text-meta text-text shadow-overlay animate-[fadeUp_140ms_var(--ease-paper)]"
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
              aria-label={t('model.modeAria', { label: v.modelLabel })}
              className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-panel px-3 py-1.5 text-small text-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="size-1.5 rounded-full bg-accent" />
              <span className="grid text-left">
                <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
                  {t('model.smart')}
                </span>
                <span className="col-start-1 row-start-1 whitespace-nowrap">{v.modelLabel}</span>
              </span>
              <Icon n="caret" size={13} className="text-faint" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={menuContent}>
              <div className="px-4 pb-1.5 pt-3 font-mono text-micro tracking-[0.14em] text-faint">
                {v.modelMenuLabel}
              </div>
              <DropdownMenu.Item onSelect={v.pickSmart} className={menuItem}>
                <span className="mt-1.5 size-[7px] rounded-full bg-accent" />
                <div className="flex-1">
                  <div className="text-body text-text">{v.modelAMode}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-small text-muted">
                    <span
                      className="flex size-4 items-center justify-center rounded-xs"
                      style={{ background: v.modelABadgeBg, color: v.modelABadgeFg }}
                    >
                      <ProviderLogo id={v.modelAProviderId} size={11} />
                    </span>
                    {v.modelAName}
                    <span className="text-faint">· {v.modelADesc}</span>
                  </div>
                </div>
                {v.checkA && <Icon n="check" size={14} className="mt-1 text-accent" />}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={v.pickFast}
                className={`${menuItem} border-t border-border`}
              >
                <span className="mt-1.5 size-[7px] rounded-full bg-border" />
                <div className="flex-1">
                  <div className="text-body text-text">{v.modelBMode}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-small text-muted">
                    <span
                      className="flex size-4 items-center justify-center rounded-xs"
                      style={{ background: v.modelBBadgeBg, color: v.modelBBadgeFg }}
                    >
                      <ProviderLogo id={v.modelBProviderId} size={11} />
                    </span>
                    {v.modelBName}
                    <span className="text-faint">· {v.modelBDesc}</span>
                  </div>
                </div>
                {v.checkB && <Icon n="check" size={14} className="mt-1 text-accent" />}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => v.openSettings('providers')}
                className="flex cursor-pointer select-none items-center gap-2 border-t border-border px-4 py-3 text-small text-muted outline-none data-[highlighted]:bg-hover-1"
              >
                <Icon n="settings" size={14} /> {t('model.changeProvider')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          type="button"
          aria-label={t('nav.focusMode')}
          onClick={v.enterQuiet}
          className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-panel px-3 py-1.5 font-[inherit] text-small text-text-2"
        >
          <Icon n="focus" size={15} />
          {v.isDesktop && <span className="whitespace-nowrap">{t('topbar.focus')}</span>}
        </button>
      </div>
    </div>
  )
}
