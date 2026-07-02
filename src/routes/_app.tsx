import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <Sidebar />

      {/* MAIN COLUMN */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />

        {/* VIEW AREA — the matched route renders here */}
        <main className="relative min-h-0 flex-1" aria-label={t('nav.content')}>
          <Outlet />
        </main>

        {/* bottom shortcut hints (advanced desktop) */}
        {v.showBar && (
          <footer className="flex h-[30px] shrink-0 items-center justify-center gap-4 border-t border-border font-mono text-eyebrow text-faint">
            <span>{t('shortcutsBar.cmd')}</span>
            <span>{t('shortcutsBar.focus')}</span>
            <span>{t('shortcutsBar.send')}</span>
            <span>{t('shortcutsBar.history')}</span>
          </footer>
        )}
      </div>
    </>
  )
}
