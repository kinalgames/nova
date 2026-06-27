import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { PERSIST_KEY, StoreProvider, useStore } from './store'

function setup() {
  return renderHook(() => useStore(), { wrapper: StoreProvider })
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('store — initial state', () => {
  it('boots into a conversation with the default model, light theme', () => {
    const { result } = setup()
    expect(result.current.s.view).toBe('conversation')
    expect(result.current.s.model).toBe('opus')
    expect(result.current.s.theme).toBe('light')
    expect(result.current.v.dark).toBe(false)
  })

  it('seeds two demo attachments', () => {
    const { result } = setup()
    expect(result.current.s.staged).toHaveLength(2)
    expect(result.current.v.hasStaged).toBe(true)
  })
})

describe('store — navigation', () => {
  it('go* handlers switch the active view and the isX flags follow', () => {
    const { result } = setup()
    act(() => result.current.v.goSettings())
    expect(result.current.s.view).toBe('settings')
    expect(result.current.v.isSettings).toBe(true)
    act(() => result.current.v.goAssistant())
    expect(result.current.v.isAssistant).toBe(true)
    expect(result.current.v.isSettings).toBe(false)
  })
})

describe('store — model & thinking', () => {
  it('switches model and reflects the label', () => {
    const { result } = setup()
    act(() => result.current.v.pickHaiku())
    expect(result.current.s.model).toBe('haiku')
    expect(result.current.v.modelLabel).toBe('Nhanh')
    act(() => result.current.v.pickOpus())
    expect(result.current.s.model).toBe('opus')
    expect(result.current.v.modelLabel).toBe('Thông minh')
  })

  it('sets the thinking level and label', () => {
    const { result } = setup()
    act(() => result.current.v.setThinkHigh())
    expect(result.current.s.thinkingLevel).toBe('high')
    expect(result.current.v.thinkLabel).toBe('Cao')
    act(() => result.current.v.setThinkOff())
    expect(result.current.s.thinkingLevel).toBe('off')
  })
})

describe('store — tools', () => {
  it('toggles a tool and updates the active count', () => {
    const { result } = setup()
    const before = result.current.v.activeCount
    act(() => result.current.v.toggle_web())
    expect(result.current.s.tools.web).toBe(false)
    expect(result.current.v.activeCount).toBe(before - 1)
    act(() => result.current.v.toggle_web())
    expect(result.current.s.tools.web).toBe(true)
  })
})

describe('store — response demo states', () => {
  it('moves through stream / error / approval / done', () => {
    const { result } = setup()
    act(() => result.current.v.setStream())
    expect(result.current.v.isStream).toBe(true)
    act(() => result.current.v.setError())
    expect(result.current.v.isError).toBe(true)
    act(() => result.current.v.setApproval())
    expect(result.current.v.respApproval).toBe(true)
    act(() => result.current.v.setDone())
    expect(result.current.v.isDone).toBe(true)
  })
})

describe('store — theme persistence', () => {
  it('dark mode flips v.dark and persists to localStorage', () => {
    const { result } = setup()
    act(() => result.current.v.setDark())
    expect(result.current.s.theme).toBe('dark')
    expect(result.current.v.dark).toBe(true)
    const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}')
    expect(saved.theme).toBe('dark')
  })

  it('restores persisted settings on a fresh mount', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ model: 'haiku', advanced: true }))
    const { result } = setup()
    expect(result.current.s.model).toBe('haiku')
    expect(result.current.s.advanced).toBe(true)
  })
})

describe('store — composer send', () => {
  it('appends the user message immediately, then a Nova reply after the delay', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => result.current.set({ draft: 'Tóm tắt giúp mình' }))
    act(() => result.current.v.send())
    // user message in flight
    expect(result.current.v.sent.at(-1)?.who).toBe('MINH')
    expect(result.current.v.sent.at(-1)?.text).toBe('Tóm tắt giúp mình')
    expect(result.current.s.typing).toBe(true)
    expect(result.current.s.draft).toBe('')
    // Nova answers after the scripted delay
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.s.typing).toBe(false)
    expect(result.current.v.sent.at(-1)?.who).toBe('NOVA')
    expect(result.current.v.sent.at(-1)?.isNova).toBe(true)
  })

  it('falls back to a default prompt when the draft is empty', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => result.current.v.send())
    expect(result.current.v.sent.at(-1)?.who).toBe('MINH')
    expect(result.current.v.sent.at(-1)?.text).toMatch(/tiếp tục/i)
  })
})

describe('store — attachments', () => {
  it('removes a staged file by id', () => {
    const { result } = setup()
    const id = result.current.s.staged[0].id
    act(() => result.current.v.removeStaged(id))
    expect(result.current.s.staged.find((f) => f.id === id)).toBeUndefined()
  })
})
