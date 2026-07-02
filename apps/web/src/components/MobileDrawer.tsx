import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { WorldLink as Link } from './WorldLink'
import { useTranslation } from 'react-i18next'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER, MENU_SEP } from './menu'

const navRow =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-ui outline-none hover:bg-hover-1 focus-visible:bg-hover-2'

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
          className="fixed inset-y-0 left-0 z-[49] flex w-[282px] max-w-[84vw] flex-col overflow-hidden bg-side animate-[slideR_200ms_ease] outline-none"
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
                className="tap flex cursor-pointer border-none bg-transparent text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-3.5">
            <div className="px-2 pb-2 font-mono text-eyebrow tracking-[0.14em] text-label">{t('sidebar.projects')}</div>
            {v.sideProjects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                onClick={v.closeDrawer}
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
              <div
                key={c.id}
                className="relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 hover:bg-hover-1"
                style={{ background: c.bg, opacity: c.deleting ? 0.5 : 1 }}
              >
                <Link
                  to="/chat/$convId"
                  params={{ convId: c.id }}
                  onClick={c.onSelect}
                  disabled={c.deleting}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 bg-transparent text-left no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:cursor-default"
                >
                  <span className="flex-1 truncate text-ui" style={{ color: c.fg }}>
                    {c.title}
                  </span>
                  {c.pinned && <Icon n="pin" size={12} fill="currentColor" className="flex-shrink-0 text-faint" />}
                </Link>
                {c.deleting ? (
                  <button
                    type="button"
                    onClick={c.undo}
                    className="tap flex-shrink-0 cursor-pointer rounded-md border-none bg-transparent px-1 text-small text-accent-text outline-none"
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
                        className="tap flex flex-shrink-0 cursor-pointer items-center justify-center border-none bg-transparent px-0.5 text-faint outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <Icon n="more" size={16} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" sideOffset={4} className={MENU_CONTENT}>
                        <DropdownMenu.Item className={MENU_ITEM} onSelect={c.rename}>
                          {t('common.rename')}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={MENU_ITEM} onSelect={c.pin}>
                          {c.pinned ? t('common.unpin') : t('common.pin')}
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className={MENU_SEP} />
                        <DropdownMenu.Item className={MENU_ITEM_DANGER} onSelect={c.del}>
                          {t('common.delete')}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                )}
              </div>
            ))}
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
