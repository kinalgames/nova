import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from './Icon'

describe('<Icon>', () => {
  it('renders the requested lucide glyph as an svg', () => {
    const { container } = render(<Icon n="search" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('class')).toContain('lucide-search')
  })

  it('inherits color via currentColor (stroke not hardcoded)', () => {
    const { container } = render(<Icon n="nova" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
  })

  it('honours an explicit size', () => {
    const { container } = render(<Icon n="check" size={24} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
  })
})
