import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '../test/util'

// shiki resolves to HTML in a real browser; mock it so the highlighted
// branch (not just the plain-text fallback) is exercised
vi.mock('../services/highlight', () => ({
  highlight: async (code: string) => `<pre class="hl">${code}</pre>`,
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
})
