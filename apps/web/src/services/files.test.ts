import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadFile, openFile, previewSample } from './files'
import type { PreviewKind } from '../state/types'

afterEach(() => vi.restoreAllMocks())

describe('files service — previewSample', () => {
  it('returns representative content for every preview kind', () => {
    const kinds: PreviewKind[] = ['md', 'csv', 'code', 'pdf', 'image']
    for (const k of kinds) {
      const s = previewSample(k)
      expect(s.type).toBeTruthy()
      expect(s.body.length).toBeGreaterThan(0)
    }
  })
})

describe('files service — download / open', () => {
  it('downloadFile creates a blob URL and clicks an anchor', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadFile('plan.md', '# hi', 'text/markdown')
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
  })

  it('openFile opens a blob URL in a new tab', () => {
    URL.createObjectURL = vi.fn(() => 'blob:y')
    URL.revokeObjectURL = vi.fn()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    openFile('data', 'text/csv')
    expect(open).toHaveBeenCalledWith('blob:y', '_blank', 'noopener')
  })

  it('no-ops safely when object URLs are unavailable', () => {
    const orig = URL.createObjectURL
    // @ts-expect-error simulate an environment without createObjectURL
    URL.createObjectURL = undefined
    expect(() => downloadFile('x', 'y', 'z')).not.toThrow()
    URL.createObjectURL = orig
  })
})
