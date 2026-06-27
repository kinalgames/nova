import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())

describe('global keyboard shortcuts', () => {
  it('⌘K opens the command palette and Escape closes it', async () => {
    renderWithStore(<App />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Ctrl+K works too (non-mac)', async () => {
    renderWithStore(<App />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('⌘. enters quiet/focus mode and toggles back out', async () => {
    renderWithStore(<App />)
    fireEvent.keyDown(window, { key: '.', metaKey: true })
    expect(await screen.findByText(/TẬP TRUNG/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '.', metaKey: true })
    await waitFor(() => expect(screen.queryByText(/TẬP TRUNG/)).not.toBeInTheDocument())
  })

  it('Escape closes an open media preview', async () => {
    renderWithStore(<App />, (s) => s.v.openPdf())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
