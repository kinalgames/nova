import { describe, expect, it } from 'vitest'
import { css, sx } from './css'

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
})

describe('sx()', () => {
  it('merges several declaration strings, later wins', () => {
    expect(sx('color:red', 'color:blue;padding:4px')).toEqual({ color: 'blue', padding: '4px' })
  })

  it('ignores falsy parts', () => {
    expect(sx('color:red', false, undefined)).toEqual({ color: 'red' })
  })
})
