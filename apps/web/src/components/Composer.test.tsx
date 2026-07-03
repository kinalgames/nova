import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUser, renderWithStore } from '../test/util'
import { screen, waitFor, within } from '@testing-library/react'
import { Composer } from './Composer'
import { HOME_TRAY, useStore } from '../state/store'

beforeEach(() => localStorage.clear())

function renderComposer() {
  return renderWithStore(<Composer />)
}

// the isolated harness mounts at '/', which is the Home view — its tray is the
// HOME_TRAY bucket, so mirror the showcase files there for chip tests
function renderComposerWithTray() {
  return renderWithStore(<Composer />, (s) =>
    s.set((x) => ({ staged: { ...x.staged, [HOME_TRAY]: x.staged.c1 } })),
  )
}

describe('B1 — staged upload states', () => {
  it('renders progress overlays and danger pills without layout tricks', async () => {
    await renderWithStore(<Composer />, (s) =>
      s.set((x) => ({
        staged: {
          ...x.staged,
          [HOME_TRAY]: [
            { id: 's1', kind: 'pdf', name: 'big.pdf', size: '12 MB', error: 'Tệp tối đa 10MB' },
            { id: 's2', kind: 'image', name: 'up.png', size: '1 MB', url: 'blob:x', progress: 40 },
            { id: 's3', kind: 'code', name: 'main.py', size: '2 KB', progress: 80 },
            { id: 's4', kind: 'image', name: 'bad.png', size: '9 MB', error: 'Ảnh tối đa 5MB' },
          ],
        },
      })),
    )
    expect(screen.getByText('Tệp tối đa 10MB')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByTitle('Ảnh tối đa 5MB')).toBeInTheDocument()
  })
})

describe('<Composer>', () => {
  it('opens the "add to chat" menu (Radix) and lists tools', async () => {
    const user = makeUser()
    await renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Tải ảnh lên')).toBeInTheDocument()
    expect(within(menu).getByText('Tra cứu web')).toBeInTheDocument()
  })

  it('exposes the thinking-level and project menus as accessible triggers', async () => {
    await renderComposer()
    expect(screen.getByRole('button', { name: /Mức suy nghĩ/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dự án/ })).toBeInTheDocument()
  })

  it('reflects typing into the message field', async () => {
    const user = makeUser()
    await renderComposer()
    const input = screen.getByRole('textbox', { name: 'Nhắn cho Nova' })
    await user.type(input, 'xin chào')
    expect(input).toHaveValue('xin chào')
  })

  it('keeps the add-to-chat menu open while toggling a tool', async () => {
    const user = makeUser()
    await renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByText('Tra cứu web'))
    // menu stays open (onSelect preventDefault) so the user can flip several
    expect(screen.queryByRole('menu')).toBeInTheDocument()
  })
})

describe('<Composer> — cap-menu items', () => {
  it('opens a staged file from its chip', async () => {
    const user = makeUser()
    await renderComposerWithTray()
    await user.click(screen.getByRole('button', { name: 'Mở Brief-Aurora.pdf' }))
    // openStaged ran without error; the chip is still present
    expect(screen.getByText('Brief-Aurora.pdf')).toBeInTheDocument()
  })

  it('removes a staged file from its chip', async () => {
    const user = makeUser()
    await renderComposerWithTray()
    await user.click(screen.getByRole('button', { name: /Bỏ Brief-Aurora\.pdf/ }))
    expect(screen.queryByText('Brief-Aurora.pdf')).not.toBeInTheDocument()
  })

  it('triggers the upload-file and project items (menu closes on select)', async () => {
    const user = makeUser()
    await renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByText('Tải tệp lên'))
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('opens and removes the staged image via its chip buttons', async () => {
    const user = makeUser()
    await renderComposerWithTray()
    await user.click(screen.getByRole('button', { name: 'Mở moodboard.png' }))
    await user.click(screen.getByRole('button', { name: 'Bỏ moodboard.png' }))
    expect(screen.queryByRole('button', { name: 'Bỏ moodboard.png' })).not.toBeInTheDocument()
  })

  it('triggers the add-from-project and screenshot items', async () => {
    const user = makeUser()
    await renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    await user.click(within(await screen.findByRole('menu')).getByText('Thêm từ dự án'))
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    await user.click(within(await screen.findByRole('menu')).getByText('Chụp màn hình'))
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('toggles every Nova tool from the menu', async () => {
    const user = makeUser()
    await renderComposer()
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    for (const label of ['Đọc trang web', 'Tài liệu của bạn']) {
      await user.click(within(menu).getByText(label))
    }
    expect(screen.queryByRole('menu')).toBeInTheDocument()
  })
})

describe('<Composer> — real upload', () => {
  it('stages an uploaded image (object URL) with a remove control', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    const user = makeUser()
    await renderComposer()
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
    const user = makeUser()
    await renderWithStore(
      <>
        <Composer />
        <ToolProbe />
      </>,
    )
    expect(screen.getByTestId('web')).toHaveTextContent('true')
    await user.click(screen.getByRole('button', { name: 'Thêm vào chat' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByText('Tra cứu web'))
    expect(screen.getByTestId('web')).toHaveTextContent('false')
  })
})
