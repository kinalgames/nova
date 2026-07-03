import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from './prompt'

const noStyles = { concise: false, warm: false, formal: false, humor: false }

describe('buildSystemPrompt — persona composition', () => {
  it('always opens with the persona identity and language mirroring', () => {
    const p = buildSystemPrompt({ assistantName: 'Bee', styles: noStyles, customPrompt: '' })
    expect(p).toContain('You are Bee')
    expect(p).toContain('language the user writes in')
    expect(p).not.toContain('Project instructions')
  })

  it('a blank name falls back to Nova', () => {
    const p = buildSystemPrompt({ assistantName: '   ', styles: noStyles, customPrompt: '' })
    expect(p).toContain('You are Nova')
  })

  it('each enabled style toggle contributes exactly its directive', () => {
    const some = buildSystemPrompt({
      assistantName: 'Nova',
      styles: { concise: true, warm: true, formal: false, humor: false },
      customPrompt: '',
    })
    expect(some).toContain('concise')
    expect(some).toContain('warm, friendly')
    expect(some).not.toContain('formal register')
    expect(some).not.toContain('humor')

    const rest = buildSystemPrompt({
      assistantName: 'Nova',
      styles: { concise: false, warm: false, formal: true, humor: true },
      customPrompt: '',
    })
    expect(rest).toContain('formal register')
    expect(rest).toContain('humor')
    expect(rest).not.toContain('concise')
  })

  it('custom prompt and project instructions append as their own sections, trimmed', () => {
    const p = buildSystemPrompt({
      assistantName: 'Nova',
      styles: noStyles,
      customPrompt: '  Luôn xưng "em" với người dùng.  ',
      projectInstructions: 'Dự án Aurora: viết cho lãnh đạo.',
    })
    const sections = p.split('\n\n')
    expect(sections[1]).toBe('Luôn xưng "em" với người dùng.')
    expect(sections[2]).toBe('Project instructions:\nDự án Aurora: viết cho lãnh đạo.')
  })

  it('blank custom/project sections are dropped entirely', () => {
    const p = buildSystemPrompt({
      assistantName: 'Nova',
      styles: noStyles,
      customPrompt: '   ',
      projectInstructions: '  ',
    })
    expect(p.split('\n\n')).toHaveLength(1)
  })
})
