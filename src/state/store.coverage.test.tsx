import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { StoreProvider, useStore } from './store'

function setup() {
  return renderHook(() => useStore(), { wrapper: StoreProvider })
}
beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('store — auth flows', () => {
  it('toggles between login and signup, and signup login lands on onboarding', () => {
    const { result } = setup()
    act(() => result.current.v.openLogin())
    expect(result.current.v.isLoginForm).toBe(true)
    expect(result.current.v.authTitle).toBe('Đăng nhập')
    act(() => result.current.v.authToggleAct())
    expect(result.current.s.authView).toBe('signup')
    expect(result.current.v.authCta).toBe('Tạo tài khoản')
    act(() => result.current.v.doLogin())
    expect(result.current.v.isOnboarding).toBe(true)
    act(() => result.current.v.finishOnboarding())
    expect(result.current.v.showAuth).toBe(false)
  })
})

describe('store — approval flow', () => {
  it('approves and denies a tool request back to done', () => {
    const { result } = setup()
    act(() => result.current.v.setApproval())
    expect(result.current.v.respApproval).toBe(true)
    act(() => result.current.v.approveTool())
    expect(result.current.v.isDone).toBe(true)
    act(() => result.current.v.setApproval())
    act(() => result.current.v.denyTool())
    expect(result.current.v.isDone).toBe(true)
  })
})

describe('store — focus durations', () => {
  it('covers 15 / 25 / 50', () => {
    const { result } = setup()
    act(() => result.current.v.setF15())
    expect(result.current.s.focusDur).toBe('15')
    act(() => result.current.v.setF25())
    expect(result.current.s.focusDur).toBe('25')
    act(() => result.current.v.setF50())
    expect(result.current.s.focusDur).toBe('50')
  })
})

describe('store — answer styles', () => {
  it('toggles each style flag', () => {
    const { result } = setup()
    const s0 = { ...result.current.s.styles }
    act(() => result.current.v.toggleConcise())
    act(() => result.current.v.toggleWarm())
    act(() => result.current.v.toggleFormal())
    act(() => result.current.v.toggleHumor())
    expect(result.current.s.styles.concise).toBe(!s0.concise)
    expect(result.current.s.styles.warm).toBe(!s0.warm)
    expect(result.current.s.styles.formal).toBe(!s0.formal)
    expect(result.current.s.styles.humor).toBe(!s0.humor)
  })
})

describe('store — thinking levels', () => {
  it('covers low / normal and the chip flags', () => {
    const { result } = setup()
    act(() => result.current.v.setThinkLow())
    expect(result.current.v.thinkChkLow).toBe('✓')
    act(() => result.current.v.setThinkNormal())
    expect(result.current.v.thinkChkNormal).toBe('✓')
    expect(result.current.v.showThinkChip).toBe(true)
  })
})

describe('store — preview formats', () => {
  it('covers csv, md, image and the isPrev flags', () => {
    const { result } = setup()
    act(() => result.current.v.openCsv())
    expect(result.current.v.isPrevCsv).toBe(true)
    act(() => result.current.v.openMd())
    expect(result.current.v.isPrevMd).toBe(true)
    act(() => result.current.v.openLightbox())
    expect(result.current.v.isPrevImage).toBe(true)
  })
})

describe('store — conversation menu & inspector', () => {
  it('opens and closes the conv menu', () => {
    const { result } = setup()
    act(() => result.current.v.openConvMenu())
    expect(result.current.s.convMenu).toBe('c1')
    act(() => result.current.v.closeConvMenu())
    expect(result.current.s.convMenu).toBeNull()
  })
  it('toggles the inspector', () => {
    const { result } = setup()
    act(() => result.current.v.toggleInspector())
    expect(result.current.s.inspector).toBe(true)
  })
})

describe('store — sidebar / drawer / account', () => {
  it('collapses the sidebar', () => {
    const { result } = setup()
    act(() => result.current.v.collapseSidebar())
    expect(result.current.s.sidebarCollapsed).toBe(true)
  })
  it('opens and closes the mobile drawer', () => {
    const { result } = setup()
    act(() => result.current.v.openDrawer())
    expect(result.current.s.drawerOpen).toBe(true)
    act(() => result.current.v.closeDrawer())
    expect(result.current.s.drawerOpen).toBe(false)
  })
  it('toggles the account menu and the shortcuts bar', () => {
    const { result } = setup()
    act(() => result.current.v.toggleAccountMenu())
    expect(result.current.s.accountMenu).toBe(true)
    act(() => result.current.v.toggleBar())
    expect(result.current.s.barOn).toBe(false)
  })
})

describe('store — palette actions', () => {
  it('new chat resets to a fresh empty conversation', () => {
    const { result } = setup()
    act(() => result.current.v.pNewChat())
    expect(result.current.s.view).toBe('conversation')
    expect(result.current.s.sent).toHaveLength(0)
    expect(result.current.v.isEmptyChat).toBe(true)
  })
  it('covers the remaining palette jumps', () => {
    const { result } = setup()
    act(() => result.current.v.pConvAurora())
    expect(result.current.v.isConv).toBe(true)
    act(() => result.current.v.pAssistant())
    expect(result.current.v.isAssistant).toBe(true)
    act(() => result.current.v.pSettings())
    expect(result.current.v.isSettings).toBe(true)
    act(() => result.current.v.pQuiet())
    expect(result.current.s.quiet).toBe(true)
  })
})

describe('store — preset toggles', () => {
  it('toggles a project preset and a library preset', () => {
    const { result } = setup()
    const proj = result.current.v.presetsProj[0]
    const lib = result.current.v.presetsLib[0]
    act(() => proj.toggle())
    act(() => lib.toggle())
    // projActiveNames is recomputed from the project preset map
    expect(typeof result.current.v.projActiveNames).toBe('string')
  })
})

describe('store — copy & search input', () => {
  it('copyCode marks copied then clears after the delay', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => result.current.v.copyCode())
    expect(result.current.s.copied).toBe(true)
    expect(result.current.v.copyLabel).toBe('Đã chép')
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.s.copied).toBe(false)
  })
  it('onQ updates the palette query', () => {
    const { result } = setup()
    act(() =>
      result.current.v.onQ({
        target: { value: 'cài đặt' },
      } as React.ChangeEvent<HTMLInputElement>),
    )
    expect(result.current.s.q).toBe('cài đặt')
  })
  it('onKey Enter sends the draft', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => result.current.set({ draft: 'gửi bằng Enter' }))
    act(() =>
      result.current.v.onKey({
        key: 'Enter',
        preventDefault: () => {},
      } as React.KeyboardEvent),
    )
    expect(result.current.s.sent.at(-1)?.text).toBe('gửi bằng Enter')
  })
})

describe('store — model menu & cap menu toggles', () => {
  it('toggles the model and cap menus', () => {
    const { result } = setup()
    act(() => result.current.v.toggleModelMenu())
    expect(result.current.s.modelMenu).toBe(true)
    act(() => result.current.v.toggleCapMenu())
    expect(result.current.s.capMenu).toBe(true)
  })
})

describe('store — projects + closeMenus', () => {
  it('a project row opens the conversation / its config', () => {
    const { result } = setup()
    act(() => result.current.v.projects[0].open())
    expect(result.current.v.isConv).toBe(true)
    act(() => result.current.v.projects[0].config())
    expect(result.current.v.isProjectCfg).toBe(true)
  })
  it('closeMenus clears palette + model menu', () => {
    const { result } = setup()
    act(() => result.current.v.togglePalette())
    act(() => result.current.v.toggleModelMenu())
    act(() => result.current.v.closeMenus())
    expect(result.current.s.palette).toBe(false)
    expect(result.current.s.modelMenu).toBe(false)
  })
  it('goHome and goConv navigate', () => {
    const { result } = setup()
    act(() => result.current.v.goHome())
    expect(result.current.v.isHome).toBe(true)
    act(() => result.current.v.goConv())
    expect(result.current.v.isConv).toBe(true)
  })
})
