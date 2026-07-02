import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeUpload, downloadFile, openFile, previewSample } from './files'
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

describe('files service — describeUpload', () => {
  const f = (name: string, type = '', size = 2048) =>
    new File([new Uint8Array(size)], name, { type })

  it('classifies uploads by mime and extension', () => {
    URL.createObjectURL = vi.fn(() => 'blob:img')
    expect(describeUpload(f('anh.png', 'image/png'))).toMatchObject({ kind: 'image', url: 'blob:img' })
    expect(describeUpload(f('doc.pdf'))).toMatchObject({ kind: 'pdf' })
    expect(describeUpload(f('script.py'))).toMatchObject({ kind: 'code' })
    expect(describeUpload(f('data.csv'))).toMatchObject({ kind: 'csv' })
    expect(describeUpload(f('note.md'))).toMatchObject({ kind: 'md' })
    // unknown or missing extensions read as documents, never crash
    expect(describeUpload(f('archive.zip'))).toMatchObject({ kind: 'pdf', url: undefined })
    expect(describeUpload(f('file.'))).toMatchObject({ kind: 'pdf' })
  })

  it('formats sizes in KB under a megabyte and MB above', () => {
    expect(describeUpload(f('a.md', '', 512)).size).toBe('1 KB')
    expect(describeUpload(f('b.md', '', 3 * 1024 * 1024)).size).toBe('3.0 MB')
  })

  it('previewSample falls back to the markdown sample for unknown kinds', () => {
    expect(previewSample('nope' as PreviewKind)).toEqual(previewSample('md'))
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
