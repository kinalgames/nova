import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Composer } from './Composer'
import { StoreProvider, useStore } from '../state/store'

beforeEach(() => localStorage.clear())

function renderComposer() {
  return render(
    <StoreProvider>
      <Composer />
    </StoreProvider>,
  )
}

describe('<Composer>', () => {
  it('opens the "add to chat" menu (Radix) and lists tools', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Tải ảnh lên')).toBeInTheDocument()
    expect(within(menu).getByText('Tra cứu web')).toBeInTheDocument()
  })

  it('exposes the thinking-level and project menus as accessible triggers', () => {
    renderComposer()
    expect(screen.getByRole('button', { name: /Mức suy nghĩ/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dự án/ })).toBeInTheDocument()
  })

  it('reflects typing into the message field', async () => {
    const user = userEvent.setup()
    renderComposer()
    const input = screen.getByRole('textbox', { name: 'Nhắn cho Nova' })
    await user.type(input, 'xin chào')
    expect(input).toHaveValue('xin chào')
  })

  it('keeps the add-to-chat menu open while toggling a tool', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByText('Tra cứu web'))
    // menu stays open (onSelect preventDefault) so the user can flip several
    expect(screen.queryByRole('menu')).toBeInTheDocument()
  })
})

describe('<Composer> — real upload', () => {
  it('stages an uploaded image (object URL) with a remove control', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    const user = userEvent.setup()
    renderComposer()
    const imgInput = document.querySelector(
      'input[type="file"][accept="image/*"]',
    ) as HTMLInputElement
    const file = new File(['x'], 'ảnh-mới.png', { type: 'image/png' })
    await user.upload(imgInput, file)
    expect(screen.getByRole('button', { name: /Bỏ ảnh-mới\.png/ })).toBeInTheDocument()
  })
})

// a tiny probe component to read store state from within the provider
function ToolProbe() {
  const { s } = useStore()
  return <output data-testid="web">{String(s.tools.web)}</output>
}

describe('<Composer> + store wiring', () => {
  it('actually flips the tool state in the store', async () => {
    const user = userEvent.setup()
    render(
      <StoreProvider>
        <Composer />
        <ToolProbe />
      </StoreProvider>,
    )
    expect(screen.getByTestId('web')).toHaveTextContent('true')
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByText('Tra cứu web'))
    expect(screen.getByTestId('web')).toHaveTextContent('false')
  })
})
