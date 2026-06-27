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

describe('store — inspector & sidebar / drawer', () => {
  it('toggles the inspector', () => {
    const { result } = setup()
    act(() => result.current.v.toggleInspector())
    expect(result.current.s.inspector).toBe(true)
  })
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
  it('toggles the shortcuts bar', () => {
    const { result } = setup()
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

describe('store — recent conversations (rename / pin / delete)', () => {
  it('deletes a conversation by id', () => {
    const { result } = setup()
    const target = result.current.v.sideConvs[1]
    const len = result.current.v.sideConvs.length
    act(() => target.del())
    expect(result.current.v.sideConvs).toHaveLength(len - 1)
    expect(result.current.v.sideConvs.find((c) => c.id === target.id)).toBeUndefined()
  })
  it('pins a conversation to the top', () => {
    const { result } = setup()
    const target = result.current.v.sideConvs[2]
    act(() => target.pin())
    expect(result.current.v.sideConvs[0].id).toBe(target.id)
  })
  it('renames via prompt and persists', () => {
    const orig = window.prompt
    window.prompt = vi.fn(() => 'Tên mới')
    const { result } = setup()
    const target = result.current.v.sideConvs[0]
    act(() => target.rename())
    expect(result.current.v.sideConvs.find((c) => c.id === target.id)?.title).toBe('Tên mới')
    window.prompt = orig
  })
})

describe('store — preset toggles', () => {
  it('toggling a project preset updates the active-skill summary', () => {
    const { result } = setup()
    const proj = result.current.v.presetsProj[0] // 'code' / Lập trình, off by default
    expect(proj.on).toBe(false)
    expect(result.current.v.projActiveNames).not.toContain('Lập trình')
    act(() => proj.toggle())
    expect(result.current.s.projPresets.code).toBe(true)
    expect(result.current.v.projActiveNames).toContain('Lập trình')
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

describe('store — auth toggle branches', () => {
  it('toggles signup back to login', () => {
    const { result } = setup()
    act(() => result.current.set({ authView: 'signup' }))
    act(() => result.current.v.authToggleAct())
    expect(result.current.s.authView).toBe('login')
  })
})

describe('store — streaming chat engine', () => {
  it('appends the user message, then streams a Nova reply token by token', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => result.current.set({ draft: 'Viết email cho mình' }))
    act(() => result.current.v.send())
    // user message lands immediately; assistant is "thinking"
    expect(result.current.s.sent.at(-1)?.who).toBe('MINH')
    expect(result.current.s.typing).toBe(true)
    // after the thinking pause, an empty Nova bubble appears and starts filling
    act(() => vi.advanceTimersByTime(700))
    const nova = result.current.s.sent.at(-1)
    expect(nova?.isNova).toBe(true)
    const partial = nova?.text ?? ''
    act(() => vi.advanceTimersByTime(120))
    expect((result.current.s.sent.at(-1)?.text ?? '').length).toBeGreaterThan(partial.length)
    // streaming completes
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.s.typing).toBe(false)
    expect((result.current.s.sent.at(-1)?.text ?? '').length).toBeGreaterThan(0)
  })

  it('a fresh chat hides the demo thread and shows the real exchange', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => result.current.v.pNewChat())
    expect(result.current.v.isEmptyChat).toBe(true)
    expect(result.current.v.hasDemo).toBe(false)
    act(() => result.current.set({ draft: 'xin chào' }))
    act(() => result.current.v.send())
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.v.isEmptyChat).toBe(false)
    expect(result.current.v.hasDemo).toBe(false)
    expect(result.current.s.sent.some((m) => m.isNova)).toBe(true)
  })
})

describe('store — advanced / alternate-state derived paths', () => {
  it('takes the advanced + haiku + ollama branches', () => {
    const { result } = setup()
    act(() =>
      result.current.set({ advanced: true, model: 'haiku', activeProvider: 'ollama' }),
    )
    expect(result.current.v.bashLabel).toBe('Bash')
    expect(result.current.v.tokenLabel).toBe('84k / 200k')
    expect(result.current.v.modelMenuLabel).toContain('MÔ HÌNH')
    expect(result.current.v.modelLabel).toBe('Nhanh')
    // ollama uses an endpoint field, not an API key
    const ollama = result.current.v.providers.find((p) => p.name.includes('máy'))
    expect(ollama?.fieldLabel).toBe('ĐỊA CHỈ MÁY CHỦ')
  })
  it('reflects all tools off in the chip + count derivations', () => {
    const { result } = setup()
    act(() =>
      result.current.set({ tools: { web: false, fetch: false, files: false, bash: false } }),
    )
    expect(result.current.v.webCheck).toBe('')
    expect(result.current.v.activeCount).toBe(0)
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
  it('closeMenus closes the palette', () => {
    const { result } = setup()
    act(() => result.current.v.togglePalette())
    expect(result.current.s.palette).toBe(true)
    act(() => result.current.v.closeMenus())
    expect(result.current.s.palette).toBe(false)
  })
  it('goHome and goConv navigate', () => {
    const { result } = setup()
    act(() => result.current.v.goHome())
    expect(result.current.v.isHome).toBe(true)
    act(() => result.current.v.goConv())
    expect(result.current.v.isConv).toBe(true)
  })
})
