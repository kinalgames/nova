import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { StoreProvider, useStore } from './store'

function setup() {
  return renderHook(() => useStore(), { wrapper: StoreProvider })
}
beforeEach(() => localStorage.clear())

describe('store — theme variants', () => {
  it('toggles light / dark', () => {
    const { result } = setup()
    act(() => result.current.v.setDark())
    expect(result.current.s.theme).toBe('dark')
    expect(result.current.v.dark).toBe(true)
    act(() => result.current.v.setLight())
    expect(result.current.s.theme).toBe('light')
    expect(result.current.v.dark).toBe(false)
  })
})

describe('store — focus duration & answer styles', () => {
  it('sets the focus session length', () => {
    const { result } = setup()
    act(() => result.current.v.setF50())
    expect(result.current.s.focusDur).toBe('50')
  })
  it('toggles an answer style', () => {
    const { result } = setup()
    const before = result.current.s.styles.warm
    act(() => result.current.v.toggleWarm())
    expect(result.current.s.styles.warm).toBe(!before)
  })
})

describe('store — advanced mode default', () => {
  it('defaults advanced ON and toggles off', () => {
    const { result } = setup()
    expect(result.current.s.advanced).toBe(true)
    act(() => result.current.v.toggleAdvanced())
    expect(result.current.s.advanced).toBe(false)
  })
})

describe('store — skill presets', () => {
  it('toggles a library preset and flips its persisted on-state', () => {
    const { result } = setup()
    const first = result.current.v.presetsLib[0]
    const id = first.id as 'code'
    const before = result.current.s.presetDefault[id]
    expect(first.on).toBe(before)
    act(() => first.toggle())
    expect(result.current.s.presetDefault[id]).toBe(!before)
    expect(result.current.v.presetsLib[0].on).toBe(!before)
  })
})

describe('store — providers', () => {
  it('selects a provider', () => {
    const { result } = setup()
    act(() => result.current.v.providers[1].select())
    expect(result.current.s.activeProvider).toBe('gemini')
  })
})

describe('store — file/media preview', () => {
  it('opens and closes the pdf preview', () => {
    const { result } = setup()
    act(() => result.current.v.openPdf())
    expect(result.current.v.hasPreview).toBe(true)
    expect(result.current.v.isPrevPdf).toBe(true)
    act(() => result.current.v.closePreview())
    expect(result.current.v.hasPreview).toBe(false)
  })
  it('opens the code preview', () => {
    const { result } = setup()
    act(() => result.current.v.openCode())
    expect(result.current.v.isPrevCode).toBe(true)
  })
})

describe('store — quiet (focus) mode', () => {
  it('enters and exits', () => {
    const { result } = setup()
    act(() => result.current.v.enterQuiet())
    expect(result.current.s.quiet).toBe(true)
    expect(result.current.v.notQuiet).toBe(false)
    act(() => result.current.v.exitQuiet())
    expect(result.current.s.quiet).toBe(false)
  })
})

describe('store — command palette navigation', () => {
  it('jumps to projects and closes the palette', () => {
    const { result } = setup()
    act(() => result.current.v.togglePalette())
    expect(result.current.s.palette).toBe(true)
    act(() => result.current.v.pProjects())
    expect(result.current.v.isProjects).toBe(true)
    expect(result.current.s.palette).toBe(false)
  })
})

describe('store — auth', () => {
  it('logout shows the login form, login dismisses it', () => {
    const { result } = setup()
    act(() => result.current.v.logout())
    expect(result.current.v.showAuth).toBe(true)
    expect(result.current.v.isLoginForm).toBe(true)
    act(() => result.current.v.doLogin())
    expect(result.current.v.showAuth).toBe(false)
  })
})

describe('store — draft input handler', () => {
  it('onDraft updates the draft from a change event', () => {
    const { result } = setup()
    act(() =>
      result.current.v.onDraft({
        target: { value: 'bản nháp' },
      } as React.ChangeEvent<HTMLInputElement>),
    )
    expect(result.current.s.draft).toBe('bản nháp')
  })
})
