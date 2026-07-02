import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { msgText, renderStore } from '../test/util'
import { visiblePath } from './thread'

function setup() {
  return renderStore()
}
beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('store — auth flows', () => {
  it('toggles between login and signup, and signup login lands on onboarding', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.openLogin())
    expect(result.current.v.isLoginForm).toBe(true)
    expect(result.current.v.authTitle).toBe('Đăng nhập')
    await act(async () => result.current.v.authToggleAct())
    expect(result.current.v.authTitle).toBe('Tạo tài khoản')
    expect(result.current.v.authCta).toBe('Tạo tài khoản')
    await act(async () => result.current.v.doLogin())
    expect(result.current.v.isOnboarding).toBe(true)
    await act(async () => result.current.v.finishOnboarding())
    expect(result.current.v.showAuth).toBe(false)
  })
})

describe('store — approval flow', () => {
  it('approves and denies a tool request back to done', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setApproval())
    expect(result.current.v.respApproval).toBe(true)
    await act(async () => result.current.v.approveTool())
    expect(result.current.v.isDone).toBe(true)
    await act(async () => result.current.v.setApproval())
    await act(async () => result.current.v.denyTool())
    expect(result.current.v.isDone).toBe(true)
  })
})

describe('store — focus durations', () => {
  it('covers 15 / 25 / 50', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setF15())
    expect(result.current.s.focusDur).toBe('15')
    await act(async () => result.current.v.setF25())
    expect(result.current.s.focusDur).toBe('25')
    await act(async () => result.current.v.setF50())
    expect(result.current.s.focusDur).toBe('50')
  })
})

describe('store — answer styles', () => {
  it('toggles each style flag', async () => {
    const { result } = await setup()
    const s0 = { ...result.current.s.styles }
    await act(async () => result.current.v.toggleConcise())
    await act(async () => result.current.v.toggleWarm())
    await act(async () => result.current.v.toggleFormal())
    await act(async () => result.current.v.toggleHumor())
    expect(result.current.s.styles.concise).toBe(!s0.concise)
    expect(result.current.s.styles.warm).toBe(!s0.warm)
    expect(result.current.s.styles.formal).toBe(!s0.formal)
    expect(result.current.s.styles.humor).toBe(!s0.humor)
  })
})

describe('store — thinking levels', () => {
  it('covers low / normal and the chip flags', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.setThinkLow())
    expect(result.current.v.thinkChkLow).toBe('✓')
    await act(async () => result.current.v.setThinkNormal())
    expect(result.current.v.thinkChkNormal).toBe('✓')
    expect(result.current.v.showThinkChip).toBe(true)
  })
})

describe('store — preview formats', () => {
  it('covers csv, md, image and the isPrev flags', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.openCsv())
    expect(result.current.v.isPrevCsv).toBe(true)
    await act(async () => result.current.v.openMd())
    expect(result.current.v.isPrevMd).toBe(true)
    await act(async () => result.current.v.openLightbox())
    expect(result.current.v.isPrevImage).toBe(true)
  })
})

describe('store — sidebar / drawer', () => {
  it('collapses the sidebar', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.collapseSidebar())
    expect(result.current.s.sidebarCollapsed).toBe(true)
  })
  it('opens and closes the mobile drawer', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.openDrawer())
    expect(result.current.s.drawerOpen).toBe(true)
    await act(async () => result.current.v.closeDrawer())
    expect(result.current.s.drawerOpen).toBe(false)
  })
  it('toggles the shortcuts bar', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.toggleBar())
    expect(result.current.s.barOn).toBe(false)
  })
})

describe('store — palette actions', () => {
  it('new chat resets to a fresh empty conversation', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.pNewChat())
    expect(result.current.v.isConv).toBe(true)
    expect(result.current.v.sent).toHaveLength(0)
    expect(result.current.v.isEmptyChat).toBe(true)
  })
  it('covers the remaining palette jumps', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.pConvAurora())
    expect(result.current.v.isConv).toBe(true)
    await act(async () => result.current.v.pAssistant())
    expect(result.current.v.settingsTab).toBe('assistant')
    await act(async () => result.current.v.pSettings())
    expect(result.current.v.settingsTab).toBe('general')
    await act(async () => result.current.v.pQuiet())
    expect(result.current.s.quiet).toBe(true)
  })
})

describe('store — per-conversation threads', () => {
  it('switching conversations loads that thread; the demo conv flags hasDemo', async () => {
    const { result } = await setup()
    const open = (id: string) => result.current.v.sideConvs.find((c) => c.id === id)!.open()
    await act(async () => open('c2'))
    expect(result.current.s.activeConv).toBe('c2')
    expect(result.current.v.sent.length).toBeGreaterThan(0)
    expect(result.current.v.hasDemo).toBe(false)
    await act(async () => open('c1'))
    expect(result.current.v.hasDemo).toBe(true)
  })

  it('new chat creates an empty conversation; send appends to it only', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const before = result.current.v.sideConvs.length
    await act(async () => result.current.v.pNewChat())
    expect(result.current.v.sideConvs.length).toBe(before + 1)
    expect(result.current.v.sent).toHaveLength(0)
    const id = result.current.s.activeConv
    await act(async () => result.current.set({ draft: 'xin chào' }))
    await act(async () => result.current.v.send())
    await act(async () => vi.advanceTimersByTime(5000))
    expect(visiblePath(result.current.s.threads[id]).length).toBeGreaterThan(1)
    // the demo conversation's seeded thread (4 messages) is untouched
    expect(visiblePath(result.current.s.threads.c1)).toHaveLength(4)
  })

  it('deleting the active conversation switches to another (after the undo window)', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    expect(result.current.s.activeConv).toBe('c1')
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c1')!.del())
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.s.activeConv).not.toBe('c1')
    expect(result.current.s.conversations.find((c) => c.id === 'c1')).toBeUndefined()
  })

  it('deleting a non-active conversation keeps the active one', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c2')!.del())
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.s.activeConv).toBe('c1')
    expect(result.current.s.conversations.find((c) => c.id === 'c2')).toBeUndefined()
  })
})

describe('store — recent conversations (rename / pin / delete)', () => {
  it('deletes a conversation by id (after the undo window)', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const target = result.current.v.sideConvs[1]
    const len = result.current.v.sideConvs.length
    await act(async () => target.del())
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.v.sideConvs).toHaveLength(len - 1)
    expect(result.current.v.sideConvs.find((c) => c.id === target.id)).toBeUndefined()
  })
  it('pins a conversation to the top and flags it', async () => {
    const { result } = await setup()
    const target = result.current.v.sideConvs[2]
    await act(async () => target.pin())
    expect(result.current.v.sideConvs[0].id).toBe(target.id)
    expect(result.current.v.sideConvs[0].pinned).toBe(true)
  })
  it('renames via the paper dialog and persists', async () => {
    const { result } = await setup()
    const target = result.current.v.sideConvs[0]
    await act(async () => target.rename())
    expect(result.current.v.renamingConv).toBe(target.id)
    expect(result.current.v.renameTitle).toBe(target.title)
    await act(async () => result.current.v.saveRename('Tên mới'))
    expect(result.current.v.renamingConv).toBeNull()
    expect(result.current.v.sideConvs.find((c) => c.id === target.id)?.title).toBe('Tên mới')
  })

  it('an empty rename keeps the old title', async () => {
    const { result } = await setup()
    const target = result.current.v.sideConvs[0]
    const before = target.title
    await act(async () => target.rename())
    await act(async () => result.current.v.saveRename('   '))
    expect(result.current.v.sideConvs.find((c) => c.id === target.id)?.title).toBe(before)
  })
})

describe('store — optimistic conversation delete + undo', () => {
  it('del flags the conversation as deleting and keeps it during the undo window', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c3')!.del())
    expect(result.current.v.sideConvs.find((c) => c.id === 'c3')?.deleting).toBe(true)
    expect(result.current.s.conversations.find((c) => c.id === 'c3')).toBeDefined()
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.s.conversations.find((c) => c.id === 'c3')).toBeUndefined()
  })

  it('undo cancels a pending delete and restores the conversation', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c3')!.del())
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c3')!.undo())
    await act(async () => vi.advanceTimersByTime(6000))
    expect(result.current.s.conversations.find((c) => c.id === 'c3')).toBeDefined()
    expect(result.current.v.sideConvs.find((c) => c.id === 'c3')?.deleting).toBe(false)
  })
})

describe('store — preset toggles', () => {
  it('toggling a project preset updates the active-skill summary', async () => {
    const { result } = await setup()
    const proj = result.current.v.presetsProj[0] // 'code' / Lập trình, off by default
    expect(proj.on).toBe(false)
    expect(result.current.v.projActiveNames).not.toContain('Lập trình')
    await act(async () => proj.toggle())
    expect(result.current.s.projects.find((p) => p.id === 'aurora')?.presets.code).toBe(true)
    expect(result.current.v.projActiveNames).toContain('Lập trình')
  })
})

describe('store — copy & search input', () => {
  it('copyCode marks copied then clears after the delay', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.copyCode())
    expect(result.current.s.copied).toBe(true)
    expect(result.current.v.copyLabel).toBe('Đã chép')
    await act(async () => vi.advanceTimersByTime(2000))
    expect(result.current.s.copied).toBe(false)
  })
  it('onQ updates the palette query', async () => {
    const { result } = await setup()
    await act(async () =>
      result.current.v.onQ({
        target: { value: 'cài đặt' },
      } as React.ChangeEvent<HTMLInputElement>),
    )
    expect(result.current.s.q).toBe('cài đặt')
  })
  it('onKey Enter sends the draft', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.set({ draft: 'gửi bằng Enter' }))
    await act(async () =>
      result.current.v.onKey({
        key: 'Enter',
        preventDefault: () => {},
      } as React.KeyboardEvent),
    )
    expect(msgText(result.current.v.sent.at(-1))).toBe('gửi bằng Enter')
  })
})

describe('store — auth toggle branches', () => {
  it('toggles signup back to login', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.authToggleAct()) // → signup
    expect(result.current.v.authTitle).toBe('Tạo tài khoản')
    await act(async () => result.current.v.authToggleAct()) // signup → login
    expect(result.current.v.authTitle).toBe('Đăng nhập')
  })
})

describe('store — provider key + connection test', () => {
  it('saves a key and a valid key tests as connected', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const claude = () => result.current.v.providers.find((p) => p.id === 'claude')!
    await act(async () => claude().setKey('sk-ant-new-key-123456'))
    expect(result.current.s.providerKeys.claude).toBe('sk-ant-new-key-123456')
    await act(async () => claude().test())
    expect(result.current.s.providerStatus.claude).toBe('testing')
    await act(async () => vi.advanceTimersByTime(1000))
    expect(result.current.s.providerStatus.claude).toBe('connected')
  })
  it('a too-short key tests as error', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const gemini = () => result.current.v.providers.find((p) => p.id === 'gemini')!
    await act(async () => gemini().setKey('x'))
    await act(async () => gemini().test())
    await act(async () => vi.advanceTimersByTime(1000))
    expect(result.current.s.providerStatus.gemini).toBe('error')
  })
})

describe('store — file download', () => {
  it('downloadPreview generates a blob and triggers an anchor download', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { result } = await setup()
    await act(async () => result.current.v.openMd())
    await act(async () => result.current.v.downloadPreview())
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})

describe('store — streaming chat engine', () => {
  it('appends the user message, then streams a Nova reply token by token', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.set({ draft: 'Viết email cho mình' }))
    await act(async () => result.current.v.send())
    // user message lands immediately; assistant is "thinking"
    expect(result.current.v.sent.at(-1)?.who).toBe('MINH')
    expect(result.current.s.typing).toBe(true)
    // after the thinking pause, an empty Nova bubble appears and starts filling
    await act(async () => vi.advanceTimersByTime(700))
    const nova = result.current.v.sent.at(-1)
    expect(nova?.role).toBe('assistant')
    const partial = msgText(nova)
    await act(async () => vi.advanceTimersByTime(120))
    expect(msgText(result.current.v.sent.at(-1)).length).toBeGreaterThan(partial.length)
    // streaming completes
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.s.typing).toBe(false)
    expect(msgText(result.current.v.sent.at(-1)).length).toBeGreaterThan(0)
  })

  it('a message composed on Home starts a fresh conversation instead of appending', async () => {
    vi.useFakeTimers()
    const LINE = 'Lên kế hoạch du lịch Đà Lạt cuối tuần này giúp mình nhé'
    const DRAFT = `${LINE}\n\n- chỗ ở\n- lịch trình`
    const { result, router } = await renderStore({ path: '/new' })
    const before = result.current.s.conversations.length
    const demoLen = visiblePath(result.current.s.threads.c1).length
    // files staged in another conversation must NOT leak into the new chat
    const c1Tray = result.current.s.staged.c1 ?? []
    expect(result.current.v.hasStaged).toBe(false)
    await act(async () => result.current.set({ draft: DRAFT }))
    await act(async () => result.current.v.send())
    // a new conversation exists — titled from the prompt's FIRST LINE, in the
    // composer's visible project (c1 was cached → aurora) — and the URL moved there
    const conv = result.current.s.conversations[0]
    expect(result.current.s.conversations).toHaveLength(before + 1)
    expect(conv.id).not.toBe('c1')
    expect(conv.title).toBe(`${LINE.slice(0, 48)}…`)
    expect(conv.projectId).toBe('aurora')
    expect(router.state.location.pathname).toBe(`/chat/${conv.id}`)
    // the full message landed in the new thread with no inherited attachments;
    // the demo showcase and its tray are untouched
    const first = result.current.v.sent.at(0)
    expect(msgText(first)).toBe(DRAFT)
    expect(first?.blocks.some((b) => b.type === 'files')).toBe(false)
    expect(visiblePath(result.current.s.threads.c1)).toHaveLength(demoLen)
    expect(result.current.s.staged.c1 ?? []).toEqual(c1Tray)
  })

  it('a fresh chat hides the demo thread and shows the real exchange', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.v.pNewChat())
    expect(result.current.v.isEmptyChat).toBe(true)
    expect(result.current.v.hasDemo).toBe(false)
    await act(async () => result.current.set({ draft: 'xin chào' }))
    await act(async () => result.current.v.send())
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.v.isEmptyChat).toBe(false)
    expect(result.current.v.hasDemo).toBe(false)
    expect(result.current.v.sent.some((m) => m.role === 'assistant')).toBe(true)
  })
})

describe('store — per-conversation attachments', () => {
  it('swaps the staged tray per conversation; sending clears it', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const open = (id: string) =>
      result.current.v.sideConvs.find((c) => c.id === id)!.open()
    // demo conv c1 seeds two attachments
    expect(result.current.v.staged).toHaveLength(2)
    // a real conversation starts with an empty tray
    await act(async () => open('c2'))
    expect(result.current.v.staged).toHaveLength(0)
    // back on c1, sending consumes its tray
    await act(async () => open('c1'))
    await act(async () => result.current.set({ draft: 'gửi đi' }))
    await act(async () => result.current.v.send())
    expect(result.current.v.staged).toHaveLength(0)
  })
})

describe('store — top bar reflects the active conversation', () => {
  it('headerTitle follows the open conversation', async () => {
    const { result } = await setup()
    expect(result.current.v.headerTitle).toBe('Đối chiếu benchmark đối thủ')
    await act(async () => result.current.v.sideConvs.find((c) => c.id === 'c2')!.open())
    expect(result.current.v.headerTitle).toBe('Đoạn mở đầu trang đích')
  })
})

describe('store — composer canSend & stop', () => {
  it('canSend reflects a non-empty trimmed draft', async () => {
    const { result } = await setup()
    expect(result.current.v.canSend).toBe(false)
    await act(async () => result.current.set({ draft: '   ' }))
    expect(result.current.v.canSend).toBe(false)
    await act(async () => result.current.set({ draft: 'xin chào' }))
    expect(result.current.v.canSend).toBe(true)
  })

  it('Enter on mobile / Shift+Enter on desktop insert a newline, not a send', async () => {
    const { result } = await setup()
    await act(async () => result.current.set({ draft: 'xin chào', vw: 375 }))
    await act(async () =>
      result.current.v.onKey({
        key: 'Enter',
        shiftKey: false,
        preventDefault: () => {},
      } as React.KeyboardEvent),
    )
    expect(result.current.s.draft).toBe('xin chào') // not sent
    await act(async () => result.current.set({ vw: 1200 }))
    await act(async () =>
      result.current.v.onKey({
        key: 'Enter',
        shiftKey: true,
        preventDefault: () => {},
      } as React.KeyboardEvent),
    )
    expect(result.current.s.draft).toBe('xin chào') // still not sent
  })

  it('stop halts an in-flight streamed reply for good', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    await act(async () => result.current.set({ draft: 'Viết email' }))
    await act(async () => result.current.v.send())
    expect(result.current.s.typing).toBe(true)
    await act(async () => result.current.v.stop())
    expect(result.current.s.typing).toBe(false)
    await act(async () => vi.advanceTimersByTime(5000))
    expect(result.current.s.typing).toBe(false)
  })
})

describe('store — labels are unified (advanced no longer rebrands them)', () => {
  it('keeps friendly labels even with advanced on (+ haiku / ollama coverage)', async () => {
    const { result } = await setup()
    await act(async () =>
      result.current.set({ advanced: true, model: 'haiku', activeProvider: 'ollama' }),
    )
    expect(result.current.v.bashLabel).toBe('Chạy lệnh')
    expect(result.current.v.tokenLabel).toBe('còn 58%')
    expect(result.current.v.meterLabel).toBe('bộ nhớ')
    expect(result.current.v.modelMenuLabel).toBe('CHẾ ĐỘ TRỢ LÝ')
    expect(result.current.v.modelADesc).toBe('Opus 4.8 · trả lời sâu')
    expect(result.current.v.traceCaret).toBe('5 công cụ · 6.4 giây')
    expect(result.current.v.modelLabel).toBe('Nhanh')
    // ollama uses an endpoint field, not an API key
    const ollama = result.current.v.providers.find((p) => p.name.includes('máy'))
    expect(ollama?.fieldLabel).toBe('ĐỊA CHỈ MÁY CHỦ')
  })
  it('reflects all tools off in the chip + count derivations', async () => {
    const { result } = await setup()
    await act(async () =>
      result.current.set({ tools: { web: false, fetch: false, files: false, bash: false } }),
    )
    expect(result.current.v.webCheck).toBe('')
    expect(result.current.v.activeCount).toBe(0)
  })
})

describe('store — projects + closeMenus', () => {
  it('navigates to a project view and its config', async () => {
    const { result } = await setup()
    expect(result.current.v.projects.length).toBeGreaterThan(0)
    await act(async () => result.current.v.goProject())
    expect(result.current.v.isProject).toBe(true)
    await act(async () => result.current.v.goProjectCfg())
    expect(result.current.v.isProjectCfg).toBe(true)
  })
  it('closeMenus closes the palette', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.togglePalette())
    expect(result.current.s.palette).toBe(true)
    await act(async () => result.current.v.closeMenus())
    expect(result.current.s.palette).toBe(false)
  })
  it('goHome and goConv navigate', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.goHome())
    expect(result.current.v.isHome).toBe(true)
    await act(async () => result.current.v.goConv())
    expect(result.current.v.isConv).toBe(true)
  })
})

describe('store — message versions (edit / regenerate / navigate)', () => {
  it('editing a user message creates version 2, drops the old tail, and re-runs', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const before = result.current.v.sent.length // demo c1: 4 messages
    const userMsg = result.current.v.sent[2] // c1-3 (user)
    await act(async () => result.current.v.startEdit(userMsg.id))
    expect(result.current.v.editingMsg).toBe(userMsg.id)
    await act(async () => result.current.v.saveEdit('câu hỏi đã sửa'))
    // version 2 selected, old reply gone until the stream lands
    expect(msgText(result.current.v.sent.at(-1))).toBe('câu hỏi đã sửa')
    expect(result.current.v.versions[result.current.v.sent.at(-1)!.id]).toEqual({
      index: 2,
      count: 2,
    })
    await act(async () => vi.advanceTimersByTime(6000))
    // new reply streamed under the edited version
    expect(result.current.v.sent.at(-1)?.role).toBe('assistant')
    expect(result.current.v.sent.length).toBe(4) // a,b, user-v2, new reply
    // navigate back to version 1 — the ORIGINAL tail returns
    const v2 = result.current.v.sent[2]
    await act(async () => result.current.v.selectVersion(v2.id, -1))
    expect(result.current.v.sent.length).toBe(before)
    expect(result.current.v.sent[2].id).toBe(userMsg.id)
  })

  it('regenerate adds a sibling reply version under the same prompt', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const reply = result.current.v.sent[1] // c1-2 assistant
    await act(async () => result.current.v.regenerate(reply.id))
    await act(async () => vi.advanceTimersByTime(6000))
    const now = result.current.v.sent[1]
    expect(now.role).toBe('assistant')
    expect(now.id).not.toBe(reply.id)
    expect(result.current.v.versions[now.id]).toEqual({ index: 2, count: 2 })
    // back to the original reply (and its tail)
    await act(async () => result.current.v.selectVersion(now.id, -1))
    expect(result.current.v.sent[1].id).toBe(reply.id)
    expect(result.current.v.sent.length).toBe(4)
  })

  it('copyMessage marks the message and clears after the delay', async () => {
    vi.useFakeTimers()
    const { result } = await setup()
    const id = result.current.v.sent[0].id
    await act(async () => result.current.v.copyMessage(id))
    expect(result.current.s.copiedMsg).toBe(id)
    await act(async () => vi.advanceTimersByTime(2000))
    expect(result.current.s.copiedMsg).toBeNull()
  })

  it('feedback toggles up/down and off again', async () => {
    const { result } = await setup()
    const reply = result.current.v.sent[1]
    await act(async () => result.current.v.setFeedback(reply.id, 'up'))
    expect(result.current.v.sent[1].feedback).toBe('up')
    await act(async () => result.current.v.setFeedback(reply.id, 'down'))
    expect(result.current.v.sent[1].feedback).toBe('down')
    await act(async () => result.current.v.setFeedback(reply.id, 'down'))
    expect(result.current.v.sent[1].feedback).toBeUndefined()
  })
})

describe('store — projects (CRUD + membership)', () => {
  it('lists seeded projects with real conversation counts', async () => {
    const { result } = await setup()
    const ids = result.current.v.projects.map((p) => p.id)
    expect(ids).toContain('chung')
    expect(ids).toContain('aurora')
    // seed: c1–c3 belong to Aurora, c4 to Chung
    expect(result.current.v.projects.find((p) => p.id === 'aurora')?.count).toBe(3)
    expect(result.current.v.projects.find((p) => p.id === 'chung')?.count).toBe(1)
  })

  it('creates a project, seeds its presets from the library, and opens it', async () => {
    const { result } = await setup()
    const before = result.current.v.projects.length
    await act(async () => result.current.v.createProject('Phong Thần', 'Game ra mắt'))
    expect(result.current.v.projects.length).toBe(before + 1)
    const created = result.current.s.projects.at(-1)
    expect(created?.name).toBe('Phong Thần')
    expect(created?.description).toBe('Game ra mắt')
    expect(created?.presets).toEqual(result.current.s.presetDefault)
    expect(result.current.v.isProject).toBe(true)
  })

  it('edits a project name and description', async () => {
    const { result } = await setup()
    await act(async () =>
      result.current.v.editProject('aurora', { name: 'Aurora 2', description: 'Mới' }),
    )
    const p = result.current.s.projects.find((x) => x.id === 'aurora')
    expect(p?.name).toBe('Aurora 2')
    expect(p?.description).toBe('Mới')
  })

  it('deleting a project reassigns its conversations to Chung', async () => {
    const { result } = await setup()
    expect(
      result.current.s.conversations.filter((c) => c.projectId === 'aurora').length,
    ).toBeGreaterThan(0)
    await act(async () => result.current.v.deleteProject('aurora'))
    expect(result.current.s.projects.find((p) => p.id === 'aurora')).toBeUndefined()
    expect(result.current.s.conversations.every((c) => c.projectId !== 'aurora')).toBe(true)
    expect(result.current.s.conversations.some((c) => c.projectId === 'chung')).toBe(true)
  })

  it('the composer picker moves the active conversation between projects', async () => {
    const { result } = await setup()
    expect(result.current.v.activeProjectName).toBe('Aurora')
    const chung = result.current.v.pickProjects.find((p) => p.id === 'chung')!
    await act(async () => chung.pick())
    expect(result.current.s.conversations.find((c) => c.id === 'c1')?.projectId).toBe('chung')
    expect(result.current.v.activeProjectName).toBe('Chung')
  })

  it('the sidebar recent list is scoped to the active project', async () => {
    const { result } = await setup()
    const ids = result.current.v.sideConvs.map((c) => c.id)
    expect(ids).toContain('c1')
    expect(ids).not.toContain('c4')
  })

  it('a new chat inherits the active project; newChatInProject targets a given one', async () => {
    const { result } = await setup()
    await act(async () => result.current.v.pNewChat())
    const a = result.current.s.activeConv
    expect(result.current.s.conversations.find((c) => c.id === a)?.projectId).toBe('aurora')
    await act(async () => result.current.v.newChatInProject('chung'))
    const b = result.current.s.activeConv
    expect(result.current.s.conversations.find((c) => c.id === b)?.projectId).toBe('chung')
  })

  it('toggling a per-project preset is isolated to that project', async () => {
    const { result } = await setup()
    const aurora0 = result.current.s.projects.find((p) => p.id === 'aurora')?.presets.code
    await act(async () => result.current.v.presetsProj[0].toggle())
    expect(result.current.s.projects.find((p) => p.id === 'aurora')?.presets.code).toBe(!aurora0)
    // Chung is untouched
    expect(result.current.s.projects.find((p) => p.id === 'chung')?.presets.code).toBe(false)
  })
})
