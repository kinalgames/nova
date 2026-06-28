import type { CSSProperties } from 'react'
import { useStore } from './state/store'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { MobileDrawer } from './components/MobileDrawer'
import { CommandPalette } from './components/CommandPalette'
import { QuietMode } from './components/QuietMode'
import { Preview } from './components/Preview'
import { Auth } from './components/Auth'
import { HomeView } from './views/HomeView'
import { ConversationView } from './views/ConversationView'
import { ProjectsView } from './views/ProjectsView'
import { ProjectConfigView } from './views/ProjectConfigView'
import { SettingsDialog } from './components/SettingsDialog'

export default function App() {
  const { v } = useStore()
  // accent is user-configurable, so it stays a dynamic override; everything
  // else (paper, ink, borders, semantic roles, dark mode) lives in CSS tokens.
  const accentVar = v.accent?.startsWith('#') ? ({ ['--accent' as string]: v.accent } as CSSProperties) : undefined
  return (
    <div
      className={`fixed inset-0 flex overflow-hidden bg-bg font-sans text-text${v.themeClass ? ` ${v.themeClass}` : ''}`}
      style={accentVar}
    >
      <Sidebar />

      {/* MAIN COLUMN */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />

        {/* VIEW AREA */}
        <main className="relative min-h-0 flex-1" aria-label="Nội dung">
          <HomeView />
          <ConversationView />
          <ProjectsView />
          <ProjectConfigView />
        </main>

        {/* bottom shortcut hints (advanced desktop) */}
        {v.showBar && (
          <footer className="flex h-[30px] shrink-0 items-center justify-center gap-4 border-t border-border font-mono text-eyebrow text-faint">
            <span>⌘K lệnh</span>
            <span>⌘. tập trung</span>
            <span>⏎ gửi</span>
            <span>⌥↑ lịch sử</span>
          </footer>
        )}
      </div>

      <MobileDrawer />
      <CommandPalette />
      <Preview />
      <SettingsDialog />
      <QuietMode />
      <Auth />

      {/* paper fibre over the whole sheet */}
      <div className="grain" aria-hidden />
    </div>
  )
}
