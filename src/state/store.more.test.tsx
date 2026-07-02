import { beforeEach, describe, expect, it } from 'vitest'
import { act } from '@testing-library/react'
import { renderStore } from '../test/util'

function setup() {
  return renderStore()
}
beforeEach(() => localStorage.clear())

describe('store — theme variants', () => {
  it('toggles light / dark', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setDark())
    expect(result.current.s.theme).toBe('dark')
    expect(result.current.v.dark).toBe(true)
    await act(async () => result.current.v.setLight())
    expect(result.current.s.theme).toBe('light')
    expect(result.current.v.dark).toBe(false)
  })
})

describe('store — focus duration & answer styles', () => {
  it('sets the focus session length', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setF50())
    expect(result.current.s.focusDur).toBe('50')
  })
  it('toggles an answer style', async () => {
    const { result } = await setup()
    const before = result.current.s.styles.warm
    await act(async () => result.current.v.toggleWarm())
    expect(result.current.s.styles.warm).toBe(!before)
  })
})

describe('store — advanced mode default', () => {
  it('defaults advanced ON and toggles off', async () => {
    const { result } = await setup()
    expect(result.current.s.advanced).toBe(true)
    await act(async () => result.current.v.toggleAdvanced())
    expect(result.current.s.advanced).toBe(false)
  })
})

describe('store — skill presets', () => {
  it('toggles a library preset and flips its persisted on-state', async () => {
    const { result } = await setup()
    const first = result.current.v.presetsLib[0]
    const id = first.id as 'code'
    const before = result.current.s.presetDefault[id]
    expect(first.on).toBe(before)
    await act(async () => first.toggle())
    expect(result.current.s.presetDefault[id]).toBe(!before)
    expect(result.current.v.presetsLib[0].on).toBe(!before)
  })
})

describe('store — model slots (cross-provider routing)', () => {
  it('routes the fast slot to another provider\u2019s model', async () => {
    const { result } = await setup()
    const openai = result.current.v.providers.find((p) => p.id === 'openai')!
    const mini = openai.models.find((m) => m.id === 'gpt-5-mini')!
    expect(mini.enabled).toBe(true)
    await act(async () => mini.useFast())
    expect(result.current.s.slots.fast).toEqual({
      providerId: 'openai',
      modelId: 'gpt-5-mini',
    })
    // the menu renders [provider icon][model name] for the slot
    expect(result.current.v.modelBName).toBe('GPT-5 mini')
    expect(result.current.v.modelBGlyph).toBe('O')
    // the smart slot is untouched — slots are independent
    expect(result.current.s.slots.smart.providerId).toBe('claude')
    // a provider with no usable profile is not routable
    const gemini = result.current.v.providers.find((p) => p.id === 'gemini')!
    expect(gemini.models[0].enabled).toBe(false)
    expect(gemini.needProfileHint).not.toBe('')
  })
})

describe('store — file/media preview', () => {
  it('opens and closes the pdf preview', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.openPdf())
    expect(result.current.v.hasPreview).toBe(true)
    expect(result.current.v.isPrevPdf).toBe(true)
    await act(async () => result.current.v.closePreview())
    expect(result.current.v.hasPreview).toBe(false)
  })
  it('opens the code preview', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.openCode())
    expect(result.current.v.isPrevCode).toBe(true)
  })
})

describe('store — quiet (focus) mode', () => {
  it('enters and exits', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.enterQuiet())
    expect(result.current.s.quiet).toBe(true)
    expect(result.current.v.notQuiet).toBe(false)
    await act(async () => result.current.v.exitQuiet())
    expect(result.current.s.quiet).toBe(false)
  })
})

describe('store — command palette navigation', () => {
  it('jumps to projects and closes the palette', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.togglePalette())
    expect(result.current.s.palette).toBe(true)
    await act(async () => result.current.v.pProjects())
    expect(result.current.v.isProjects).toBe(true)
    expect(result.current.s.palette).toBe(false)
  })
})

describe('store — auth', () => {
  it('logout shows the login form, login dismisses it', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.logout())
    expect(result.current.v.showAuth).toBe(true)
    expect(result.current.v.isLoginForm).toBe(true)
    await act(async () => result.current.v.doLogin())
    expect(result.current.v.showAuth).toBe(false)
  })
})

describe('store — draft input handler', () => {
  it('onDraft updates the draft from a change event', async () => {
    const { result } = await setup()
    await act(async () =>
      result.current.v.onDraft({
        target: { value: 'bản nháp' },
      } as React.ChangeEvent<HTMLInputElement>),
    )
    expect(result.current.s.draft).toBe('bản nháp')
  })
})
