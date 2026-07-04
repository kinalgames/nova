import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { PERSIST_KEY } from './persist'
import { MOCK_REPLY } from '../test/fixture'
import { msgText, renderStore } from '../test/util'

function setup() {
  return renderStore()
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('store — initial state', () => {
  it('boots into a conversation with the default model, light theme', async () => {
    const { result } = await setup()
    expect(result.current.v.isConv).toBe(true)
    expect(result.current.s.activeSlot).toBe('smart')
    expect(result.current.s.theme).toBe('light')
    expect(result.current.v.dark).toBe(false)
  })

  it('seeds two staged attachments on the fixture conversation', async () => {
    const { result } = await setup()
    expect(result.current.v.staged).toHaveLength(2)
    expect(result.current.v.hasStaged).toBe(true)
  })
})

describe('store — navigation', () => {
  it('go* handlers switch the active view and the isX flags follow', async () => {
    const { result } = await setup()
    act(() => result.current.v.goSettings())
    expect(result.current.v.settingsOpen).toBe(true)
    expect(result.current.v.settingsTab).toBe('general')
    act(() => result.current.v.goAssistant())
    expect(result.current.v.settingsTab).toBe('assistant')
    expect(result.current.v.settingsOpen).toBe(true)
  })
})

describe('store — model & thinking', () => {
  it('switches the active slot and reflects the label', async () => {
    const { result } = await setup()
    act(() => result.current.v.pickFast())
    expect(result.current.s.activeSlot).toBe('fast')
    expect(result.current.v.modelLabel).toBe('Nhanh')
    act(() => result.current.v.pickSmart())
    expect(result.current.s.activeSlot).toBe('smart')
    expect(result.current.v.modelLabel).toBe('Thông minh')
  })

  it('sets the thinking level and label', async () => {
    const { result } = await setup()
    act(() => result.current.v.setThinkHigh())
    expect(result.current.s.thinkingLevel).toBe('high')
    expect(result.current.v.thinkLabel).toBe('Cao')
    act(() => result.current.v.setThinkOff())
    expect(result.current.s.thinkingLevel).toBe('off')
  })
})

describe('store — tools', () => {
  it('toggles a tool and updates the active count', async () => {
    const { result } = await setup()
    const before = result.current.v.activeCount
    act(() => result.current.v.toggle_web())
    expect(result.current.s.tools.web).toBe(false)
    expect(result.current.v.activeCount).toBe(before - 1)
    act(() => result.current.v.toggle_web())
    expect(result.current.s.tools.web).toBe(true)
  })
})

describe('store — response states', () => {
  it('the isX flags mirror respState; setDone clears back to done', async () => {
    const { result } = await setup()
    act(() => result.current.set({ respState: 'stream' }))
    expect(result.current.v.isStream).toBe(true)
    act(() => result.current.set({ respState: 'error' }))
    expect(result.current.v.isError).toBe(true)
    act(() => result.current.set({ respState: 'approval' }))
    expect(result.current.v.respApproval).toBe(true)
    act(() => result.current.v.setDone())
    expect(result.current.v.isDone).toBe(true)
  })
})

describe('store — theme persistence', () => {
  it('dark mode flips v.dark and persists to localStorage', async () => {
    const { result } = await setup()
    act(() => result.current.v.setDark())
    expect(result.current.s.theme).toBe('dark')
    expect(result.current.v.dark).toBe(true)
    const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}')
    expect(saved.theme).toBe('dark')
  })

  it('corrupted persisted JSON boots clean defaults instead of crashing', async () => {
    localStorage.setItem(PERSIST_KEY, '{not-json')
    const { result } = await setup()
    expect(result.current.s.theme).toBe('light')
    expect(result.current.s.activeSlot).toBe('smart')
  })

  it('restores persisted settings on a fresh mount', async () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ activeSlot: 'fast', advanced: true }))
    const { result } = await setup()
    expect(result.current.s.activeSlot).toBe('fast')
    expect(result.current.s.advanced).toBe(true)
  })

  it('heals persisted slots whose model was retired from the catalog', async () => {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        slots: {
          // claude-opus-4 was retired upstream — must fall back to the default
          smart: { providerId: 'claude', modelId: 'claude-opus-4' },
          // still-valid ref must be preserved untouched
          fast: { providerId: 'gemini', modelId: 'gemini-3.5-flash' },
        },
      }),
    )
    const { result } = await setup()
    expect(result.current.s.slots.smart).toEqual({
      providerId: 'claude',
      modelId: 'claude-opus-4-8',
    })
    expect(result.current.s.slots.fast).toEqual({
      providerId: 'gemini',
      modelId: 'gemini-3.5-flash',
    })
  })
})

describe('store — composer send', () => {
  it('appends the user message and streams the reply through the proxy', async () => {
    const { result } = await setup()
    await act(async () => result.current.set({ draft: 'Tóm tắt giúp mình' }))
    await act(async () => result.current.v.send())
    // the user turn landed and the composer cleared
    expect(result.current.s.draft).toBe('')
    const user = result.current.v.sent.at(-2)
    expect(user?.who).toBe('THÀNH')
    expect(msgText(user)).toBe('Tóm tắt giúp mình')
    // the hermetic stream finished the reply through the REAL parser
    expect(result.current.s.typing).toBe(false)
    expect(result.current.v.sent.at(-1)?.role).toBe('assistant')
    expect(msgText(result.current.v.sent.at(-1))).toBe(MOCK_REPLY)
  })

  it('ignores send when the draft is empty (no message, no typing)', async () => {
    const { result } = await setup()
    const before = result.current.v.sent.length
    act(() => result.current.v.send())
    expect(result.current.v.sent.length).toBe(before)
    expect(result.current.s.typing).toBe(false)
    expect(result.current.v.canSend).toBe(false)
  })
})

describe('store — attachments', () => {
  it('removes a staged file by id', async () => {
    const { result } = await setup()
    const id = result.current.v.staged[0].id
    act(() => result.current.v.removeStaged(id))
    expect(result.current.v.staged.find((f) => f.id === id)).toBeUndefined()
  })
})
