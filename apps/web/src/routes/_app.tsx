import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { getToken } from '../services/auth'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'
import { VerifyBanner } from '../components/VerifyBanner'

export const Route = createFileRoute('/_app')({
  // the product requires a session — token-only so the app still opens offline
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

/** the app shell — sidebar, top bar, view outlet, shortcut hints */
export function AppLayout() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <Sidebar />

      {/* MAIN COLUMN */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <VerifyBanner />

        {/* VIEW AREA — the matched route renders here */}
        <main className="relative min-h-0 flex-1" aria-label={t('nav.content')}>
          <Outlet />
        </main>

        {/* bottom shortcut hints (advanced desktop) — click for the cheatsheet */}
        {v.showBar && (
          <footer className="flex h-[30px] shrink-0 items-center justify-center border-t border-border">
            <button
              type="button"
              onClick={v.openCheatsheet}
              aria-label={t('cheatsheet.openAria')}
              className="flex h-full cursor-pointer items-center gap-4 border-none bg-transparent px-4 font-mono text-eyebrow text-faint outline-none hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              <span>{t('shortcutsBar.cmd')}</span>
              <span>{t('shortcutsBar.focus')}</span>
              <span>{t('shortcutsBar.send')}</span>
              <span>{t('shortcutsBar.history')}</span>
            </button>
          </footer>
        )}
      </div>
    </>
  )
}
