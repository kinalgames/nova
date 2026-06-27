import { beforeEach, describe, expect, it } from 'vitest'
import { composeReply, resetReplySeed, thinkingDelay, tokenInterval } from './chat'

beforeEach(() => resetReplySeed(1))

describe('chat service — composeReply', () => {
  it('returns a contextual reply for known intents', () => {
    const r = composeReply('giúp sửa bug component React', {
      model: 'haiku',
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
      const r = composeReply('zzz', { model: 'haiku', thinking: 'off', project: 'Aurora' })
      expect(r).not.toContain('{project}')
      if (r.includes('Aurora')) sawProject = true
    }
    expect(sawProject).toBe(true)
  })

  it('Thông minh (opus) with thinking adds a deliberation note', () => {
    resetReplySeed(3)
    const opus = composeReply('viết email', { model: 'opus', thinking: 'high', project: 'X' })
    resetReplySeed(3)
    const haiku = composeReply('viết email', { model: 'haiku', thinking: 'high', project: 'X' })
    expect(opus.length).toBeGreaterThan(haiku.length)
  })
})

describe('chat service — pacing', () => {
  it('thinking delay scales with level', () => {
    expect(thinkingDelay('off')).toBe(0)
    expect(thinkingDelay('high')).toBeGreaterThan(thinkingDelay('low'))
  })
  it('Nhanh (haiku) streams faster than Thông minh (opus)', () => {
    expect(tokenInterval('haiku')).toBeLessThan(tokenInterval('opus'))
  })
})
