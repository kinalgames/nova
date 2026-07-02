import { Fragment } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER, MENU_SEP } from './menu'

type ConvVM = ReturnType<typeof useStore>['v']['sideConvs'][number]

function ConvRow({ c }: { c: ConvVM }) {
  const { t } = useTranslation()
  return (
    <div
      data-hover={c.deleting ? undefined : 'soft'}
      className="group relative mb-px flex items-center rounded-sm"
      style={{ background: c.bg, opacity: c.deleting ? 0.5 : 1 }}
    >
      <Link
        to="/chat/$convId"
        params={{ convId: c.id }}
        onClick={c.onSelect}
        disabled={c.deleting}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm bg-transparent px-2.5 py-2 text-left no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-disabled:cursor-default"
      >
        <span className="flex-1 truncate text-ui" style={{ color: c.fg }}>
          {c.title}
        </span>
      </Link>

      {c.deleting ? (
        <button
          type="button"
          onClick={c.undo}
          className="mr-2 flex-shrink-0 cursor-pointer rounded-md border-none bg-transparent px-1 py-0.5 text-meta text-accent-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('common.undo')}
        </button>
      ) : c.busy ? (
        <span
          role="img"
          aria-label={t('common.replying')}
          className="absolute right-2.5 flex size-[7px] items-center justify-center"
        >
          <span
            className="absolute inset-0 rounded-full bg-[var(--accent-line)]"
            style={{ animation: 'pulseRing 1.6s ease-out infinite' }}
          />
          <span className="size-[5px] rounded-full bg-accent" />
        </span>
      ) : (
        <>
          {c.pinned && (
            <Icon
              n="pin"
              size={12}
              fill="currentColor"
              className="absolute right-2.5 flex-shrink-0 text-faint transition-opacity group-hover:opacity-0 group-focus-within:opacity-0"
            />
          )}
          <div className="absolute right-1.5 flex items-center gap-0.5 rounded-md bg-[var(--side)] pl-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              aria-label={c.pinned ? t('common.unpin') : t('common.pin')}
              aria-pressed={c.pinned}
              onClick={c.pin}
              className="flex cursor-pointer rounded border-none bg-transparent p-1 text-faint outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon n="pin" size={14} fill={c.pinned ? 'currentColor' : 'none'} />
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={t('common.convOptions')}
                  className="flex cursor-pointer rounded border-none bg-transparent p-1 text-faint outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Icon n="more" size={15} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" sideOffset={4} className={MENU_CONTENT}>
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={c.rename}>
                    {t('common.rename')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={c.pin}>
                    {c.pinned ? t('common.unpin') : t('common.pin')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={c.archive}>
                    {c.archived ? t('common.unarchive') : t('common.archive')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className={MENU_SEP} />
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={c.exportMd}>
                    {t('common.exportMd')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={c.exportJson}>
                    {t('common.exportJson')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={c.share}>
                    {t('common.share')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className={MENU_SEP} />
                  <DropdownMenu.Item className={MENU_ITEM_DANGER} onSelect={c.del}>
                    {t('common.delete')}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </>
      )}
    </div>
  )
}

export function Sidebar() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.showSidebar) return null
  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden bg-side transition-[width] duration-[180ms] ease-[ease]"
      style={{ width: v.sidebarW }}
    >
      {/* brand row */}
      <div className={`group flex h-14 shrink-0 items-center ${v.sidebarExpanded ? 'justify-between pl-4 pr-3' : 'justify-center'}`}>
        {v.sidebarExpanded ? (
          <>
            <button
              type="button"
              aria-label={t('nav.home')}
              onClick={v.goHome}
              className="flex min-w-0 cursor-pointer items-center gap-2 border-none bg-transparent"
            >
              <div className="size-[13px] shrink-0 rounded-full bg-ink shadow-[inset_-3px_-3px_0_var(--side)]" />
              <span className="font-display text-h3">Nova</span>
            </button>
            <button
              type="button"
              aria-label={t('nav.collapseSidebar')}
              onClick={v.collapseSidebar}
              className="flex cursor-pointer border-none bg-transparent text-muted"
            >
              <Icon n="collapse" size={16} />
            </button>
          </>
        ) : (
          <div className="relative">
            <button
              type="button"
              aria-label={t('nav.home')}
              onClick={v.goHome}
              className="flex size-9 cursor-pointer items-center justify-center border-none bg-transparent transition-opacity group-hover:opacity-0"
            >
              <div className="size-[13px] shrink-0 rounded-full bg-ink shadow-[inset_-3px_-3px_0_var(--side)]" />
            </button>
            <button
              type="button"
              aria-label={t('nav.expandSidebar')}
              onClick={v.collapseSidebar}
              className="pointer-events-none absolute inset-0 flex cursor-pointer items-center justify-center border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            >
              <Icon n="expandRail" size={16} />
            </button>
          </div>
        )}
      </div>

      {/* new + search */}
      <div className="flex flex-col gap-1.5 px-3">
        <button
          type="button"
          onClick={v.pNewChat}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border border-border bg-panel px-3 py-2 text-ui text-text"
          style={{ justifyContent: v.railJustify }}
        >
          <Icon n="plus" size={17} />
          {v.sidebarExpanded && <span className="flex-1 text-left">{t('nav.newChat')}</span>}
        </button>
        <button
          type="button"
          onClick={v.togglePalette}
          data-hover="soft"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border-none px-3 py-2 text-ui text-muted"
          style={{ justifyContent: v.railJustify }}
        >
          <Icon n="search" size={17} />
          {v.sidebarExpanded && (
            <>
              <span className="flex-1 text-left">{t('nav.search')}</span>
              <span className="font-mono text-eyebrow text-faint">⌘K</span>
            </>
          )}
        </button>
      </div>

      {/* lists */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-3">
        {v.sidebarExpanded && (
          <div className="px-2 pb-2 font-mono text-eyebrow tracking-[.14em] text-label">{t('sidebar.projects')}</div>
        )}
        {v.sideProjects.map((p) => (
          <Link
            key={p.id}
            to="/projects/$projectId"
            params={{ projectId: p.id }}
            data-hover="soft"
            aria-label={t('nav.projectAria', { name: p.name })}
            className="mb-px flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 no-underline"
            style={{ justifyContent: v.railJustify, background: p.bg }}
          >
            <span className="size-[9px] shrink-0 rounded-xs" style={{ background: p.dot }} />
            {v.sidebarExpanded && (
              <>
                <span className="flex-1 truncate text-left text-ui" style={{ color: p.fg }}>
                  {p.name}
                </span>
                <span className="font-mono text-micro text-faint">{p.count}</span>
              </>
            )}
          </Link>
        ))}
        {v.sidebarExpanded && (
          <>
            <div className="px-2 pb-2 pt-4 font-mono text-eyebrow tracking-[.14em] text-label">
              {t('sidebar.recent', { project: v.currentProjectName.toUpperCase() })}
            </div>
            {v.sideGroups.map((g) => (
              <Fragment key={g.id}>
                <div className="px-2 pb-1 pt-2 font-mono text-micro tracking-[.14em] text-faint first:pt-0">
                  {g.label}
                </div>
                {g.convs.map((c) => (
                  <ConvRow key={c.id} c={c} />
                ))}
              </Fragment>
            ))}
            {v.archivedConvs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={v.toggleArchived}
                  aria-expanded={v.archivedOpen}
                  data-hover="soft"
                  className="mt-2 flex w-full cursor-pointer items-center gap-1.5 rounded-sm border-none bg-transparent px-2 py-1.5 font-mono text-micro tracking-[.14em] text-faint"
                >
                  <span className="flex-1 text-left">
                    {t('sidebar.archived')} · {v.archivedConvs.length}
                  </span>
                  <Icon n="caret" size={12} className={v.archivedOpen ? 'rotate-180' : undefined} />
                </button>
                {v.archivedOpen && v.archivedConvs.map((c) => <ConvRow key={c.id} c={c} />)}
              </>
            )}
          </>
        )}
      </div>

      {/* footer */}
      <div className="shrink-0 border-t border-border px-3 pb-3 pt-2">
        {!v.loggedIn && (
          <button
            type="button"
            onClick={v.goSettings}
            data-hover="soft"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border-none px-2.5 py-2 text-ui"
            style={{ justifyContent: v.railJustify, color: v.setFg, background: v.setBg }}
          >
            <Icon n="settings" size={16} />
            {v.sidebarExpanded && <span className="flex-1 text-left">{t('nav.settings')}</span>}
          </button>
        )}
        {v.loggedIn ? (
          <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={t('nav.accountAria', { name: v.userName })}
              data-hover="soft"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border-none bg-transparent px-2.5 py-2"
              style={{ justifyContent: v.railJustify }}
            >
              <div className="size-[26px] shrink-0 rounded-full bg-[linear-gradient(135deg,#E0A06B,var(--accent))]" />
              {v.sidebarExpanded && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-small">{v.userName}</div>
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
                  <div className="text-ui text-text">{v.userName}</div>
                  <div className="text-meta text-muted">{t('user.plan')}</div>
                </div>
              </div>
              <DropdownMenu.Separator className={MENU_SEP} />
              <DropdownMenu.Item className={MENU_ITEM} onSelect={v.goSettings}>
                {t('nav.settings')}
              </DropdownMenu.Item>
              <DropdownMenu.Item className={MENU_ITEM_DANGER} onSelect={v.logout}>
                {t('nav.logout')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <button
            type="button"
            onClick={v.openLogin}
            data-hover="soft"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border-none px-2.5 py-2 text-ui text-text"
            style={{ justifyContent: v.railJustify }}
          >
            <Icon n="login" size={17} />
            {v.sidebarExpanded && <span className="flex-1 text-left">{t('nav.login')}</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
