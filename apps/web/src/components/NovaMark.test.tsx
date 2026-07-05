import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { NovaMark } from './NovaMark'

describe('<NovaMark>', () => {
  it('renders a solid circle sized by the size prop, with no inner icon markup', () => {
    const { container } = render(<NovaMark size={22} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('22px')
    expect(el.style.height).toBe('22px')
    expect(el.className).toContain('rounded-full')
    expect(el.className).toContain('bg-ink')
    expect(el.querySelector('svg')).toBeNull()
  })

  it('carves the crescent shadow from the given surface var, defaulting to --bg', () => {
    const { container } = render(<NovaMark size={13} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.boxShadow).toContain('var(--bg)')
  })

  it('matches the shadow color to an explicit surface (e.g. the sidebar rail)', () => {
    const { container } = render(<NovaMark size={13} on="--side" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.boxShadow).toContain('var(--side)')
  })

  it('scales the shadow offset proportionally with size (a bigger mark needs a bigger crescent)', () => {
    const small = render(<NovaMark size={13} />).container.firstElementChild as HTMLElement
    const big = render(<NovaMark size={48} />).container.firstElementChild as HTMLElement
    const offsetOf = (el: HTMLElement) => parseInt(el.style.boxShadow.match(/inset (-?\d+)px/)?.[1] ?? '0', 10)
    expect(Math.abs(offsetOf(big))).toBeGreaterThan(Math.abs(offsetOf(small)))
  })
})
