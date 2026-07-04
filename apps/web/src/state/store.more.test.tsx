import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderStore } from '../test/util'

// onboarding/rename persist the assistant name server-side — stub ONLY that
// call so the suite never attempts a real network round-trip
vi.mock('../services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/auth')>()),
  updateMe: vi.fn(async () => true),
}))

function setup() {
  return renderStore()
}
beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('store — organization (Track B)', () => {
  // generous timeout: the file's FIRST test bears the whole import/transform
  // cost under coverage instrumentation on slow parallel runs
  it('archives a conversation out of recents and restores it', { timeout: 15_000 }, async () => {
    const { result } = await setup()
    const c2 = () => result.current.v.sideConvs.find((c) => c.id === 'c2')
    await act(async () => c2()!.archive())
    expect(result.current.v.sideConvs.some((c) => c.id === 'c2')).toBe(false)
    expect(result.current.v.archivedConvs.map((c) => c.id)).toEqual(['c2'])
    await act(async () => result.current.v.toggleArchived())
    expect(result.current.v.archivedOpen).toBe(true)
    await act(async () => result.current.v.archivedConvs[0].archive())
    expect(result.current.v.sideConvs.some((c) => c.id === 'c2')).toBe(true)
    expect(result.current.v.archivedConvs).toHaveLength(0)
  })

  it('date-groups the recents — every conversation lands in exactly one group', async () => {
    const { result } = await setup()
    const groups = result.current.v.sideGroups
    const all = groups.flatMap((g) => g.convs.map((c) => c.id))
    expect(all.sort()).toEqual(['c1', 'c2', 'c3'])
    expect(groups.every((g) => ['pinned', 'today', 'yesterday', 'week', 'older'].includes(g.id))).toBe(true)
    expect(groups.length).toBeGreaterThan(1) // seeds are staggered across days
    // pinning moves a conversation into the pinned group
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c3')!.pin())
    expect(
      result.current.v.sideGroups.find((g) => g.id === 'pinned')?.convs.map((c) => c.id),
    ).toEqual(['c3'])
  })

  it('message activity moves the conversation into today', async () => {
    vi.useFakeTimers()
    const { result } = await renderStore({ path: '/chat/c3' })
    await act(async () => result.current.set({ draft: 'chạm nhóm hôm nay' }))
    await act(async () => result.current.v.send())
    expect(
      result.current.v.sideGroups.find((g) => g.id === 'today')?.convs.some((c) => c.id === 'c3'),
    ).toBe(true)
  })

  it('a failed share raises a toast that auto-clears', async () => {
    // the hermetic 503 backend refuses the snapshot — the user hears WHY
    // and the toast dissolves on its own (success paths: store.live BE4)
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.sideConvs[0].share())
    expect(result.current.s.toast).toBe('Tạo liên kết thất bại — thử lại sau')
    await act(async () => vi.advanceTimersByTime(3000))
    expect(result.current.s.toast).toBeNull()
  })

  it('exports markdown and json through the download service', async () => {
    const { result } = await setup()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await act(async () => result.current.v.sideConvs[0].exportMd())
    await act(async () => result.current.v.sideConvs[0].exportJson())
    expect(click).toHaveBeenCalledTimes(2)
    click.mockRestore()
  })
})

describe('store — account & settings (Track D)', () => {
  it('renaming the profile drives greetings, labels and new messages', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setUserName('Lan Phương'))
    expect(result.current.v.userFirstName).toBe('Lan')
    expect(result.current.v.userName).toBe('Lan Phương')
    await act(async () => result.current.set({ draft: 'xin chào' }))
    await act(async () => result.current.v.send())
    // the reply lands instantly (hermetic stream) — the USER turn carries it
    expect(result.current.v.sent.at(-2)?.who).toBe('LAN')
  })

  it('the assistant name labels new replies', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setAssistantName('Trợ lý'))
    await act(async () => result.current.set({ draft: 'chào bạn nhé' }))
    await act(async () => result.current.v.send())
    expect(result.current.v.sent.at(-1)?.who).toBe('TRỢ LÝ')
  })

  it('completeOnboarding persists assistant name, styles and the default slot', async () => {
    localStorage.setItem('nova.auth.token', 'tok') // onboarding follows a fresh signup
    const { result } = await renderStore({ path: '/onboarding' })
    await act(async () =>
      result.current.v.completeOnboarding({
        assistantName: '  ',
        styles: { concise: false, warm: true, formal: false, humor: false },
        slot: 'fast',
      }),
    )
    // blank name falls back to Nova; the rest persists
    expect(result.current.s.assistantName).toBe('Nova')
    expect(result.current.s.styles.warm).toBe(true)
    expect(result.current.s.activeSlot).toBe('fast')
    expect(result.current.v.showAuth).toBe(false)
  })

  it('exports all local data as a json download', async () => {
    const { result } = await setup()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await act(async () => result.current.v.exportAllData())
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })

  it('the cheatsheet dialog opens and closes', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.openCheatsheet())
    expect(result.current.s.cheatsheet).toBe(true)
    await act(async () => result.current.v.closeCheatsheet())
    expect(result.current.s.cheatsheet).toBe(false)
  })
})

describe('store — projects completion (Track C)', () => {
  it('uploads and removes a real project file', async () => {
    const { result } = await renderStore({ path: '/projects/aurora/config' })
    const before = result.current.v.viewProjectFiles.length
    const file = new File(['# notes'], 'notes.md', { type: 'text/markdown' })
    await act(async () => result.current.v.addViewProjectFile(file))
    const files = result.current.v.viewProjectFiles
    expect(files).toHaveLength(before + 1)
    const added = files.at(-1)!
    expect(added.name).toBe('notes.md')
    expect(added.kind).toBe('md')
    // opening routes through the preview overlay
    await act(async () => added.open())
    expect(result.current.s.preview).toMatchObject({ kind: 'md', name: 'notes.md' })
    await act(async () => added.remove())
    expect(result.current.v.viewProjectFiles).toHaveLength(before)
  })

  it('creates a project with a chosen accent and recolours it later', async () => {
    const { result } = await renderStore()
    await act(async () => result.current.v.createProject('Màu sắc', '', 'var(--info)'))
    const proj = result.current.s.projects.find((p) => p.name === 'Màu sắc')!
    expect(proj.accent).toBe('var(--info)')
    await act(async () => result.current.v.editProject(proj.id, { accent: 'var(--plum)' }))
    expect(result.current.s.projects.find((p) => p.id === proj.id)?.accent).toBe('var(--plum)')
  })
})

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
  it('routes the fast slot to another provider\u2019s model via the picker', async () => {
    const { result } = await setup()
    // the FAST picker lists fast-mode models across providers with caps meta
    const mini = result.current.v.fastChoices.find((c) => c.key === 'openai:gpt-5.4-mini')!
    expect(mini.connected).toBe(true)
    expect(mini.caps.reasoning).toBe(true)
    expect(mini.meta).toContain('$0.75')
    await act(async () => mini.pick())
    expect(result.current.s.slots.fast).toEqual({
      providerId: 'openai',
      modelId: 'gpt-5.4-mini',
    })
    // the menu renders [provider icon][model name] for the slot
    expect(result.current.v.modelBName).toBe('GPT-5.4 mini')
    expect(result.current.v.modelBGlyph).toBe('O')
    // the smart slot is untouched — slots are independent
    expect(result.current.s.slots.smart.providerId).toBe('claude')
    // a provider with no profile lists DIMMED with a connect CTA, never pickable
    const gem = result.current.v.smartChoices.find((c) => c.providerId === 'gemini')!
    expect(gem.connected).toBe(false)
  })

  it('the smart picker lists only smart-mode models; ollama is dynamic', async () => {
    const { result } = await setup()
    const keys = result.current.v.smartChoices.map((c) => c.key)
    expect(keys).toContain('claude:claude-opus-4-8')
    expect(keys).toContain('claude:claude-sonnet-5')
    expect(keys).toContain('openai:gpt-5.5')
    // fast-mode models never leak into the smart list
    expect(keys).not.toContain('claude:claude-haiku-4-5')
    // no hardcoded ollama placeholders — its catalog comes from the endpoint
    expect(keys.some((k) => k.startsWith('ollama:'))).toBe(false)
    // a hydrated ollama catalog lists in BOTH pickers
    await act(async () =>
      result.current.set({
        ollamaModels: [{ id: 'ornith:35b', name: 'ornith:35b', mode: 'fast', caps: { reasoning: true }, ctx: 262_144, inPrice: 0, outPrice: 0 }],
      }),
    )
    expect(result.current.v.smartChoices.some((c) => c.key === 'ollama:ornith:35b')).toBe(true)
    expect(result.current.v.fastChoices.some((c) => c.key === 'ollama:ornith:35b')).toBe(true)
  })
})

describe('store — file/media preview', () => {
  it('opens and closes a pdf preview', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.previewFile({ kind: 'pdf', name: 'brief.pdf', open: 'pdf' }))
    expect(result.current.v.hasPreview).toBe(true)
    expect(result.current.v.isPrevPdf).toBe(true)
    await act(async () => result.current.v.closePreview())
    expect(result.current.v.hasPreview).toBe(false)
  })
  it('opens a code preview', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.previewFile({ kind: 'code', name: 'analyze.py', open: 'code' }))
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
  it('logout shows the login form, a stored session leaves it', async () => {
    const { result, router } = await setup()
    await act(async () => result.current.v.logout())
    expect(result.current.v.showAuth).toBe(true)
    expect(result.current.v.isLoginForm).toBe(true)
    // signing back in stores a token — the app opens again
    localStorage.setItem('nova.auth.token', 'tok')
    await act(async () => {
      await router.navigate({ to: '/new' })
    })
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
