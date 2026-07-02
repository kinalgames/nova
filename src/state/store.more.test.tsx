import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderStore } from '../test/util'

function setup() {
  return renderStore()
}
beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('store — organization (Track B)', () => {
  it('archives a conversation out of recents and restores it', async () => {
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

  it('share copies a link and raises the auto-clearing toast', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const write = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    })
    await act(async () => result.current.v.sideConvs[0].share())
    expect(write).toHaveBeenCalledWith(expect.stringContaining('/share/'))
    expect(result.current.s.toast).toBe('Đã chép liên kết chia sẻ')
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
    expect(result.current.v.sent.at(-1)?.who).toBe('LAN')
  })

  it('the assistant name labels new replies', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.setAssistantName('Trợ lý'))
    await act(async () => result.current.set({ draft: 'chào bạn nhé' }))
    await act(async () => result.current.v.send())
    await act(async () => vi.advanceTimersByTime(9000))
    expect(result.current.v.sent.at(-1)?.who).toBe('TRỢ LÝ')
  })

  it('completeOnboarding persists assistant name, styles and the default slot', async () => {
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
  it('project instructions steer the reply; the default project stays neutral', async () => {
    vi.useFakeTimers()
    // c2 belongs to aurora, whose description acts as instructions
    const aurora = await renderStore({ path: '/chat/c2' })
    await act(async () => aurora.result.current.set({ draft: 'viết mở đầu giúp mình' }))
    await act(async () => aurora.result.current.v.send())
    await act(async () => vi.advanceTimersByTime(9000))
    const reply = aurora.result.current.v.sent.at(-1)!
    expect(reply.role).toBe('assistant')
    expect(
      reply.blocks.find((b) => b.type === 'text' && b.text.includes('Bám theo chỉ dẫn của dự án Aurora')),
    ).toBeTruthy()
  })

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
