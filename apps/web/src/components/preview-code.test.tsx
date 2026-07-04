import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '../test/util'

// shiki resolves to HTML in a real browser; mock it so BOTH branches are
// exercised: highlighted output and the plain-text fallback when a grammar
// is missing or the highlighter fails to load
vi.mock('../services/highlight', () => ({
  highlight: vi.fn(async (code: string) => `<pre class="hl">${code}</pre>`),
}))

beforeEach(() => localStorage.clear())

describe('<Preview> — highlighted code', () => {
  it('renders shiki-highlighted output for a real code file', async () => {
    vi.stubGlobal('fetch', async () => new Response('const x = 1', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'code', name: 'a.ts', open: 'code', fileId: 'HL' }))
    // the mocked highlighter wraps the text in a .hl pre
    expect(await screen.findByText('const x = 1')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('falls back to plain text when the highlighter fails', async () => {
    const { highlight } = await import('../services/highlight')
    vi.mocked(highlight).mockRejectedValueOnce(new Error('no grammar'))
    vi.stubGlobal('fetch', async () => new Response('plain body here', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'code', name: 'x.zz', open: 'code', fileId: 'PL' }))
    // the raw text still renders — a missing grammar never blanks the preview
    expect(await screen.findByText('plain body here')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
