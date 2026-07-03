import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { WorldLink as Link } from './WorldLink'
import { useTranslation } from 'react-i18next'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER, MENU_SEP } from './menu'

const navRow =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-ui outline-none hover:bg-hover-1 focus-visible:bg-hover-2 active:bg-hover-2'

type ConvVM = ReturnType<typeof useStore>['v']['sideConvs'][number]

/** one conversation row in the drawer — shared by RECENT and ARCHIVED so the
 *  full options menu (and restore) is reachable on mobile, at parity with the
 *  desktop sidebar */
function DrawerConvRow({ c }: { c: ConvVM }) {
  const { t } = useTranslation()
  return (
    <div
      className="relative flex min-h-10 items-center gap-1 rounded-sm pl-2.5 pr-0.5"
      style={{ background: c.bg, opacity: c.deleting ? 0.5 : 1 }}
    >
      <Link
        to="/chat/$convId"
        params={{ convId: c.id }}
        onClick={c.onSelect}
        disabled={c.deleting}
        aria-current={c.active ? 'page' : undefined}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-[0.85em] self-stretch bg-transparent text-left text-meta no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-disabled:cursor-default"
      >
        <span className="flex-1 truncate" style={{ color: c.fg }}>
          {c.title}
        </span>
        {c.pinned && <Icon n="pin" size={12} fill="currentColor" className="flex-shrink-0 text-faint" />}
      </Link>
      {c.deleting ? (
        <button
          type="button"
          onClick={c.undo}
          className="flex flex-shrink-0 cursor-pointer items-center justify-center self-stretch rounded-md border-none bg-transparent px-2 text-small text-accent-text outline-none"
        >
          {t('common.undo')}
        </button>
      ) : c.busy ? (
        <span
          role="img"
          aria-label={t('common.replying')}
          className="relative mr-1 flex size-[7px] flex-shrink-0 items-center justify-center"
        >
          <span
            className="absolute inset-0 rounded-full bg-[var(--accent-line)]"
            style={{ animation: 'pulseRing 1.6s ease-out infinite' }}
          />
          <span className="size-[5px] rounded-full bg-accent" />
        </span>
      ) : (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={t('common.convOptions')}
              className="flex w-10 flex-shrink-0 cursor-pointer items-center justify-center self-stretch border-none bg-transparent text-faint outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              <Icon n="more" size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className={MENU_CONTENT}>
              {/* full parity with the desktop sidebar menu */}
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
              {c.shared && (
                <DropdownMenu.Item className={MENU_ITEM} onSelect={c.unshare}>
                  {t('share.revoke')}
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className={MENU_SEP} />
              <DropdownMenu.Item className={MENU_ITEM_DANGER} onSelect={c.del}>
                {t('common.delete')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  )
}

export function MobileDrawer() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <Dialog.Root
      open={v.drawerOpen}
      onOpenChange={(o) => {
        if (!o) v.closeDrawer()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[48] animate-[dim_120ms_ease] bg-scrim" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-[49] flex w-[282px] max-w-[84vw] flex-col overflow-hidden bg-side pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] animate-[slideR_200ms_ease] outline-none"
        >
          <VisuallyHidden asChild>
            <Dialog.Title>{t('nav.navigation')}</Dialog.Title>
          </VisuallyHidden>
          <div className="flex h-14 flex-shrink-0 items-center justify-between pl-4 pr-3.5">
            <div className="flex items-center gap-2">
              <div className="size-[13px] rounded-full bg-ink shadow-[inset_-3px_-3px_0_var(--side)]" />
              <span className="font-display text-h3">Nova</span>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t('common.close')}
                className="tap -mr-3 flex cursor-pointer items-center justify-center border-none bg-transparent text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon n="close" size={17} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-1.5 px-3">
            <button onClick={v.pNewChat} className={`${navRow} border border-border bg-panel`}>
              <Icon n="plus" size={17} />
              <span>{t('nav.newChat')}</span>
            </button>
            <button onClick={v.togglePalette} className={`${navRow} text-muted`}>
              <Icon n="search" size={17} />
              <span>{t('nav.search')}</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-3.5">
            <div className="px-2 pb-2 font-mono text-eyebrow tracking-[0.14em] text-label">{t('sidebar.projects')}</div>
            {v.sideProjects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                onClick={v.closeDrawer}
                aria-current={p.current ? 'true' : undefined}
                aria-label={t('nav.projectAria', { name: p.name })}
                className={`${navRow} no-underline`}
                style={{ background: p.bg }}
              >
                <span className="size-[9px] rounded-xs" style={{ background: p.dot }} />
                <span className="flex-1" style={{ color: p.fg }}>
                  {p.name}
                </span>
              </Link>
            ))}
            <div className="px-2 pb-2 pt-4 font-mono text-eyebrow tracking-[0.14em] text-label">
              {t('sidebar.recent', { project: v.currentProjectName.toUpperCase() })}
            </div>
            {v.sideConvs.map((c) => (
              <DrawerConvRow key={c.id} c={c} />
            ))}
            {v.archivedConvs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={v.toggleArchived}
                  aria-expanded={v.archivedOpen}
                  className="mt-2 flex min-h-10 w-full cursor-pointer items-center gap-1.5 rounded-sm border-none bg-transparent px-2 py-2 font-mono text-micro tracking-[.14em] text-faint active:bg-hover-1"
                >
                  <span className="flex-1 text-left">
                    {t('sidebar.archived')} · {v.archivedConvs.length}
                  </span>
                  <Icon n="caret" size={12} className={v.archivedOpen ? 'rotate-180' : undefined} />
                </button>
                {v.archivedOpen && v.archivedConvs.map((c) => <DrawerConvRow key={c.id} c={c} />)}
              </>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-border px-3 pb-3.5 pt-2">
            <button onClick={v.goSettings} className={navRow} style={{ color: v.setFg }}>
              <Icon n="settings" size={16} />
              <span>{t('nav.settings')}</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
