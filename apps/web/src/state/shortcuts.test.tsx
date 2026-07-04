import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('global keyboard shortcuts', () => {
  // generous timeout: the file's FIRST test bears the whole import/transform
  // cost under coverage instrumentation on slow parallel runs
  it('⌘K opens the command palette and Escape closes it', { timeout: 15_000 }, async () => {
    await renderApp()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Ctrl+K works too (non-mac)', async () => {
    await renderApp()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('⌘. enters quiet/focus mode and toggles back out', async () => {
    await renderApp()
    fireEvent.keyDown(window, { key: '.', metaKey: true })
    expect(await screen.findByText(/TẬP TRUNG/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '.', metaKey: true })
    await waitFor(() => expect(screen.queryByText(/TẬP TRUNG/)).not.toBeInTheDocument())
  })

  it('Escape closes an open media preview', async () => {
    await renderApp((s) => s.v.previewFile({ kind: 'pdf', name: 'brief.pdf', open: 'pdf' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
