import { beforeEach, describe, expect, it } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())

describe('<Preview> — formats', () => {
  it('code preview renders the file with syntax', async () => {
    renderWithStore(<App />, (s) => s.v.openCode())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('analyze.py').length).toBeGreaterThan(0)
  })

  it('csv preview renders a table header', async () => {
    renderWithStore(<App />, (s) => s.v.openCsv())
    expect(await screen.findByText('người dùng')).toBeInTheDocument()
  })

  it('markdown preview renders the document title', async () => {
    renderWithStore(<App />, (s) => s.v.openMd())
    expect(await screen.findByText('Kế hoạch ra mắt Aurora')).toBeInTheDocument()
  })

  it('image lightbox opens as a dialog', async () => {
    renderWithStore(<App />, (s) => s.v.openLightbox())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('closes via the close button', async () => {
    const { rerender } = renderWithStore(<App />, (s) => s.v.openPdf())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    void rerender
  })

  it('clicking the dark backdrop (not the media) closes the preview', async () => {
    renderWithStore(<App />, (s) => s.v.openMd())
    const dialog = await screen.findByRole('dialog')
    const media = dialog.querySelector('.paper-doc') as HTMLElement
    const backdrop = media.parentElement as HTMLElement
    fireEvent.click(backdrop)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
