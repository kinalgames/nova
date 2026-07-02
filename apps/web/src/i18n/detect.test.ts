import { afterEach, describe, expect, it, vi } from 'vitest'

// detectInitial runs at module init — import a FRESH module copy per scenario
afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('i18n — initial language detection', () => {
  it('honours a stored language choice over the browser locale', async () => {
    vi.resetModules()
    localStorage.setItem('nova.lang', 'en')
    const mod = await import('./index')
    expect(mod.default.language).toBe('en')
  })

  it('detects vietnamese browsers on a first boot', async () => {
    vi.resetModules()
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('vi-VN')
    const mod = await import('./index')
    expect(mod.default.language).toBe('vi')
  })

  it('falls back to vietnamese when the browser reports no locale', async () => {
    vi.resetModules()
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
    const mod = await import('./index')
    expect(mod.default.language).toBe('vi')
  })

  it('keeps <html lang> in sync when the language changes', async () => {
    vi.resetModules()
    localStorage.setItem('nova.lang', 'vi')
    const mod = await import('./index')
    expect(document.documentElement.lang).toBe('vi')
    mod.setLanguage('en')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(localStorage.getItem('nova.lang')).toBe('en')
  })
})
