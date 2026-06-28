import type { CSSProperties } from 'react'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { RouterContext } from '../router'
import type { SettingsTab } from '../state/types'
import { StoreProvider, useStore } from '../state/store'
import { CommandPalette } from '../components/CommandPalette'
import { Preview } from '../components/Preview'
import { SettingsDialog } from '../components/SettingsDialog'
import { QuietMode } from '../components/QuietMode'
import { MobileDrawer } from '../components/MobileDrawer'

const SETTINGS_TABS = ['general', 'providers', 'assistant'] as const

export interface RootSearch {
  /** which Settings tab is open; absent = Settings closed (it is an overlay) */
  settings?: SettingsTab
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search: Record<string, unknown>): RootSearch => {
    const s = search.settings
    return typeof s === 'string' && (SETTINGS_TABS as readonly string[]).includes(s)
      ? { settings: s as SettingsTab }
      : {}
  },
  component: RootLayout,
})

function RootLayout() {
  const { storeInit, onStore } = Route.useRouteContext()
  return (
    <StoreProvider initial={storeInit} onStore={onStore}>
      <Shell />
    </StoreProvider>
  )
}

function Shell() {
  const { v } = useStore()
  // accent is user-configurable, so it stays a dynamic override; everything
  // else (paper, ink, borders, semantic roles, dark mode) lives in CSS tokens.
  const accentVar = v.accent?.startsWith('#')
    ? ({ ['--accent' as string]: v.accent } as CSSProperties)
    : undefined
  return (
    <div
      className={`fixed inset-0 flex overflow-hidden bg-bg font-sans text-text${v.themeClass ? ` ${v.themeClass}` : ''}`}
      style={accentVar}
    >
      <Outlet />

      <MobileDrawer />
      <CommandPalette />
      <Preview />
      <SettingsDialog />
      <QuietMode />

      {/* paper fibre over the whole sheet */}
      <div className="grain" aria-hidden />
    </div>
  )
}
