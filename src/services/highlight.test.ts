import { describe, expect, it } from 'vitest'
import { highlight } from './highlight'

describe('highlight — JS-engine shiki', () => {
  it('highlights a known language with the terminal theme', async () => {
    const html = await highlight('const x: number = 1', 'ts')
    expect(html).toContain('shiki')
    expect(html).toContain('min-dark')
    expect(html).toContain('const')
  })

  it('resolves language aliases and reuses the loaded grammar', async () => {
    const first = await highlight('print("hi")', 'py')
    const second = await highlight('print("lai")', 'py')
    expect(first).toContain('print')
    expect(second).toContain('lai')
  })

  it('returns null for an unknown language so callers keep the plain fallback', async () => {
    expect(await highlight('hello', 'khong-ton-tai')).toBeNull()
    expect(await highlight('hello', 'text')).toBeNull()
  })
})
