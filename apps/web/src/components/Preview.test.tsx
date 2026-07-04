import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('<Preview> — formats', () => {
  it('code preview renders the file with syntax', async () => {
    await renderApp((s) => s.v.openCode())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('analyze.py').length).toBeGreaterThan(0)
  })

  it('csv preview renders a table header', async () => {
    await renderApp((s) => s.v.openCsv())
    expect(await screen.findByText('người dùng')).toBeInTheDocument()
  })

  it('markdown preview renders the document title', async () => {
    await renderApp((s) => s.v.openMd())
    expect(await screen.findByText('Kế hoạch ra mắt Aurora')).toBeInTheDocument()
  })

  it('image lightbox opens as a dialog', async () => {
    await renderApp((s) => s.v.openLightbox())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('closes via the close button', async () => {
    const { rerender } = await renderApp((s) => s.v.openPdf())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    void rerender
  })

  it('clicking the dark backdrop (not the media) closes the preview', async () => {
    await renderApp((s) => s.v.openMd())
    const dialog = await screen.findByRole('dialog')
    const media = dialog.querySelector('.paper-doc') as HTMLElement
    const backdrop = media.parentElement as HTMLElement
    fireEvent.click(backdrop)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('<Preview> — real uploaded files (fetched content)', () => {
  it('renders real markdown fetched from R2', async () => {
    vi.stubGlobal('fetch', async () => new Response('# Real Heading\n\nnội dung thật', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'md', name: 'plan.md', open: 'md', fileId: 'F1' }))
    expect(await screen.findByText('Real Heading')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('renders a real csv as a table', async () => {
    vi.stubGlobal('fetch', async () => new Response('col_a,col_b\nx1,y2', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'csv', name: 'data.csv', open: 'csv', fileId: 'F2' }))
    expect(await screen.findByText('col_a')).toBeInTheDocument()
    expect(await screen.findByText('x1')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('renders real code text (plain fallback before shiki resolves)', async () => {
    vi.stubGlobal('fetch', async () => new Response('print("hi")', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'code', name: 'a.py', open: 'code', fileId: 'F3' }))
    expect(await screen.findByText(/print\("hi"\)/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('shows a load-failed message when the fetch fails', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 500 }))
    await renderApp((s) => s.v.previewFile({ kind: 'md', name: 'x.md', open: 'md', fileId: 'F4' }))
    expect(await screen.findByText(/Không tải được tệp/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('<Preview> — real image/pdf/quoted-csv', () => {
  const stubBlob = () => {
    vi.stubGlobal('fetch', async () => new Response(new Blob(['bytes']), { status: 200 }))
    // jsdom lacks a real object-URL factory
    ;(URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:preview'
    ;(URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {}
  }

  it('renders a real image from a fetched blob', async () => {
    stubBlob()
    await renderApp((s) => s.v.previewFile({ kind: 'image', name: 'p.png', open: 'image', fileId: 'I1' }))
    const img = await screen.findByRole('img', { name: 'p.png' })
    expect(img.getAttribute('src')).toBe('blob:preview')
    vi.unstubAllGlobals()
  })

  it('renders a real pdf in an object embed', async () => {
    stubBlob()
    await renderApp((s) => s.v.previewFile({ kind: 'pdf', name: 'd.pdf', open: 'pdf', fileId: 'P1' }))
    // Dialog.Portal renders into document.body, not the render container
    const obj = await waitFor(() => {
      const o = document.querySelector('object[type="application/pdf"]')
      if (!o) throw new Error('no object yet')
      return o as HTMLObjectElement
    })
    expect(obj.getAttribute('data')).toBe('blob:preview')
    vi.unstubAllGlobals()
  })

  it('parses quoted csv fields with embedded commas', async () => {
    vi.stubGlobal('fetch', async () => new Response('name,note\n"Doe, John","a ""quote"" here"', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'csv', name: 'q.csv', open: 'csv', fileId: 'C9' }))
    expect(await screen.findByText('Doe, John')).toBeInTheDocument()
    expect(screen.getByText('a "quote" here')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('<Preview> — real file edge cases', () => {
  it('handles Windows CRLF csv and ragged rows', async () => {
    vi.stubGlobal('fetch', async () => new Response('a,b,c\r\n1,2,3\r\nonly-one', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'csv', name: 'w.csv', open: 'csv', fileId: 'CR' }))
    expect(await screen.findByText('only-one')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('shows load-failed when a binary (image) fetch fails', async () => {
    vi.stubGlobal('fetch', async () => new Response('x', { status: 500 }))
    await renderApp((s) => s.v.previewFile({ kind: 'image', name: 'p.png', open: 'image', fileId: 'IF' }))
    expect(await screen.findByText(/Không tải được tệp/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('falls back to plain text lang for an unknown extension', async () => {
    vi.stubGlobal('fetch', async () => new Response('just some log lines', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'code', name: 'server.log', open: 'code', fileId: 'LG' }))
    expect(await screen.findByText(/just some log lines/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('<Preview> — auth header + empty file', () => {
  it('sends the bearer token when present and renders content', async () => {
    localStorage.setItem('nova.auth.token', 'tok-xyz')
    let sawAuth = false
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      sawAuth = (init.headers as Record<string, string>)?.authorization === 'Bearer tok-xyz'
      return new Response('# Titled\n', { status: 200 })
    })
    await renderApp((s) => s.v.previewFile({ kind: 'md', name: 'a.md', open: 'md', fileId: 'T1' }))
    expect(await screen.findByText('Titled')).toBeInTheDocument()
    expect(sawAuth).toBe(true)
    vi.unstubAllGlobals()
  })

  it('renders an empty csv without crashing', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 200 }))
    await renderApp((s) => s.v.previewFile({ kind: 'csv', name: 'e.csv', open: 'csv', fileId: 'E1' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
