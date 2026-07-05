import type React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitationMark, hideOnError } from './CitationMark'

describe('CitationMark', () => {
  it('degrades to a plain numbered marker with no url — never a dead link', () => {
    render(<CitationMark n="2" />)
    expect(screen.getByText('[2]')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('an unparseable url falls back to the raw string as the host (no crash)', () => {
    render(<CitationMark n="1" url="not a valid url" />)
    const link = screen.getByRole('link', { name: 'not a valid url' })
    expect(link).toHaveAttribute('href', 'not a valid url')
  })

  it('strips a leading www. from the host, and prefers the real title when given', () => {
    render(<CitationMark n="3" url="https://www.example.com/a" title="Example Article" />)
    expect(screen.getByRole('link', { name: 'Example Article' })).toBeInTheDocument()
  })

  it('a broken favicon image hides itself instead of showing a broken-image icon', () => {
    const img = document.createElement('img')
    hideOnError({ currentTarget: img } as unknown as React.SyntheticEvent<HTMLImageElement>)
    expect(img.style.visibility).toBe('hidden')
  })
})
