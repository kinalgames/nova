import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { ToggleRow } from './ToggleRow'
import { makeUser } from '../test/util'

describe('<ToggleRow>', () => {
  it('renders an accessible switch reflecting the on state', () => {
    render(<ToggleRow title="Chế độ tối" sub="…" on={false} onToggle={() => {}} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onToggle when activated by click', async () => {
    const onToggle = vi.fn()
    render(<ToggleRow title="Chế độ tối" sub="…" on={false} onToggle={onToggle} />)
    await makeUser().click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('is operable by keyboard (Space)', async () => {
    const onToggle = vi.fn()
    render(<ToggleRow title="Chế độ tối" sub="…" on={false} onToggle={onToggle} />)
    const sw = screen.getByRole('switch')
    sw.focus()
    await makeUser().keyboard(' ')
    expect(onToggle).toHaveBeenCalled()
  })

  it('omits the divider when marked as the last row', () => {
    const { container } = render(
      <ToggleRow title="Cuối" sub="…" on={false} onToggle={() => {}} last />,
    )
    expect(container.querySelector('.border-b')).toBeNull()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <ToggleRow title="Chế độ tối" sub="Theo hệ thống" on onToggle={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
