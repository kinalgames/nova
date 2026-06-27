import type { CSSProperties } from 'react'
import { useStore } from './state/store'
import { css } from './css'
import { Sidebar } from './components/Sidebar'
import { AccountMenu, ConvMenu } from './components/Menus'
import { TopBar, ModelMenu } from './components/TopBar'
import { MobileDrawer } from './components/MobileDrawer'
import { CommandPalette } from './components/CommandPalette'
import { QuietMode } from './components/QuietMode'
import { Preview } from './components/Preview'
import { Auth } from './components/Auth'
import { HomeView } from './views/HomeView'
import { ConversationView } from './views/ConversationView'
import { ProjectsView } from './views/ProjectsView'
import { ProjectConfigView } from './views/ProjectConfigView'
import { NovaView } from './views/NovaView'
import { SettingsView } from './views/SettingsView'

export default function App() {
  const { v } = useStore()
  const rootStyle = css(
    `position:fixed;inset:0;background:var(--bg);font-family:var(--font-body);color:var(--text);display:flex;overflow:hidden`,
  )
  // accent is user-configurable, so it stays a dynamic override; everything
  // else (paper, ink, borders, semantic roles, dark mode) lives in CSS tokens.
  const accentVar = v.accent?.startsWith('#') ? ({ ['--accent' as string]: v.accent } as CSSProperties) : undefined
  return (
    <div className={v.dark ? 'dark' : undefined} style={accentVar ? { ...rootStyle, ...accentVar } : rootStyle}>
      <Sidebar />
      <AccountMenu />
      <ConvMenu />

      {/* MAIN COLUMN */}
      <div style={css('flex:1;min-width:0;display:flex;flex-direction:column;position:relative')}>
        <TopBar />
        <ModelMenu />

        {/* VIEW AREA */}
        <div style={css('flex:1;min-height:0;position:relative')}>
          <HomeView />
          <ConversationView />
          <ProjectsView />
          <ProjectConfigView />
          <NovaView />
          <SettingsView />
        </div>

        {/* bottom shortcut hints (advanced desktop) */}
        {v.showBar && (
          <div style={css('flex-shrink:0;height:30px;display:flex;align-items:center;justify-content:center;gap:18px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:10.5px;color:var(--faint)')}>
            <span>⌘K lệnh</span>
            <span>⌘. tập trung</span>
            <span>⏎ gửi</span>
            <span>⌥↑ lịch sử</span>
          </div>
        )}
      </div>

      <MobileDrawer />
      <CommandPalette />
      <Preview />
      <QuietMode />
      <Auth />

      {/* paper fibre over the whole sheet */}
      <div className="grain" aria-hidden />
    </div>
  )
}
