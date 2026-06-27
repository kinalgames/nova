import { describe, expect, it } from 'vitest'
import { css } from './css'

describe('css()', () => {
  it('parses a declaration string into a React style object', () => {
    expect(css('color:red;font-size:12px')).toEqual({ color: 'red', fontSize: '12px' })
  })

  it('preserves custom properties verbatim', () => {
    expect(css('--accent:#be6a3a')).toEqual({ '--accent': '#be6a3a' })
  })

  it('keeps values containing colons intact (e.g. var fallbacks, urls)', () => {
    expect(css('background:var(--bg)')).toEqual({ background: 'var(--bg)' })
  })

  it('ignores empty segments, segments with no colon, and empty property names', () => {
    expect(css(';;color:red;;')).toEqual({ color: 'red' })
    expect(css('display flex;color:blue')).toEqual({ color: 'blue' })
    expect(css(':red;color:green')).toEqual({ color: 'green' })
  })

  it('camel-cases kebab properties but leaves custom properties verbatim', () => {
    expect(css('background-color:red;--my-token:1px')).toEqual({
      backgroundColor: 'red',
      '--my-token': '1px',
    })
  })

  it('returns the same cached object for an identical declaration', () => {
    const a = css('color:teal')
    const b = css('color:teal')
    expect(a).toBe(b)
  })
})
