import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { ToggleRow } from './ToggleRow'

describe('<ToggleRow>', () => {
  it('renders an accessible switch reflecting the on state', () => {
    render(<ToggleRow title="Chế độ tối" sub="…" on={false} onToggle={() => {}} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onToggle when activated by click', async () => {
    const onToggle = vi.fn()
    render(<ToggleRow title="Chế độ tối" sub="…" on={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('is operable by keyboard (Space)', async () => {
    const onToggle = vi.fn()
    render(<ToggleRow title="Chế độ tối" sub="…" on={false} onToggle={onToggle} />)
    const sw = screen.getByRole('switch')
    sw.focus()
    await userEvent.keyboard(' ')
    expect(onToggle).toHaveBeenCalled()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <ToggleRow title="Chế độ tối" sub="Theo hệ thống" on onToggle={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
