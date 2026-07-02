// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { composeReply, estimateTokens, resetReplySeed, thinkingDelay } from './chat'
import { defaultSlots, findModel } from '../data/defs'

beforeEach(() => resetReplySeed(1))

describe('chat service — composeReply', () => {
  it('returns a contextual reply for known intents', () => {
    const r = composeReply('giúp sửa bug component React', {
      slot: 'fast',
      thinking: 'normal',
      project: 'Aurora',
    })
    expect(r).toBeTypeOf('string')
    expect(r.length).toBeGreaterThan(0)
  })

  it('interpolates the project name in fallbacks', () => {
    // a message matching no template uses a fallback (some contain {project})
    let sawProject = false
    for (let i = 0; i < 6; i++) {
      resetReplySeed(i + 1)
      const r = composeReply('zzz', { slot: 'fast', thinking: 'off', project: 'Aurora' })
      expect(r).not.toContain('{project}')
      if (r.includes('Aurora')) sawProject = true
    }
    expect(sawProject).toBe(true)
  })

  it('Thông minh (smart slot) with thinking adds a deliberation note', () => {
    resetReplySeed(3)
    const smart = composeReply('viết email', { slot: 'smart', thinking: 'high', project: 'X' })
    resetReplySeed(3)
    const fast = composeReply('viết email', { slot: 'fast', thinking: 'high', project: 'X' })
    expect(smart.length).toBeGreaterThan(fast.length)
  })
})

describe('chat service — pacing & usage', () => {
  it('thinking delay scales with level', () => {
    expect(thinkingDelay('off')).toBe(0)
    expect(thinkingDelay('high')).toBeGreaterThan(thinkingDelay('low'))
  })
  it('the default fast model streams quicker than the default smart model', () => {
    expect(findModel(defaultSlots.fast).pace).toBeLessThan(findModel(defaultSlots.smart).pace)
  })
  it('estimates tokens at roughly four characters each, never zero', () => {
    expect(estimateTokens('x'.repeat(400))).toBe(100)
    expect(estimateTokens('a')).toBe(1)
  })
})