import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())

describe('conversation — appended messages & typing', () => {
  it('renders sent user + Nova messages and the typing indicator', async () => {
    renderWithStore(<App />, (s) =>
      s.set({
        activeConv: 'c1',
        threads: {
          c1: [
            { who: 'MINH', color: 'var(--muted)', text: 'Câu hỏi của mình', isNova: false },
            { who: 'NOVA', color: 'var(--accent)', text: 'Nova trả lời đây', isNova: true },
          ],
        },
        typing: true,
        typingLabel: 'Đang chạy tính toán…',
      }),
    )
    expect(await screen.findByText('Câu hỏi của mình')).toBeInTheDocument()
    expect(screen.getByText('Nova trả lời đây')).toBeInTheDocument()
    expect(screen.getByText('Đang chạy tính toán…')).toBeInTheDocument()
  })
})

describe('app — accent override', () => {
  it('applies a concrete accent colour as a CSS variable override', async () => {
    const { container } = renderWithStore(<App />, (s) => s.set({ accent: '#3B5BA9' }))
    expect(await screen.findByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
    const root = container.querySelector('#root > div, div')
    expect((root as HTMLElement | null)?.style.getPropertyValue('--accent')).toBe('#3B5BA9')
  })
})

describe('preview — uploaded image (object URL)', () => {
  it('renders an <img> when the preview carries a url', async () => {
    renderWithStore(<App />, (s) =>
      s.set({ preview: { kind: 'image', name: 'ảnh.png', url: 'blob:mock' } }),
    )
    const dialog = await screen.findByRole('dialog')
    const img = within(dialog).getByRole('img')
    expect(img).toHaveAttribute('src', 'blob:mock')
    expect(img).toHaveAttribute('alt', 'ảnh.png')
  })
})

describe('top bar — token detail disclosure', () => {
  it('exposes the exact token count on the meter and reveals it on focus', async () => {
    renderWithStore(<App />)
    const meter = await screen.findByRole('button', { name: /84k \/ 200k token/ })
    expect(meter).toBeInTheDocument()
    meter.focus()
    expect(await screen.findByText('84k / 200k token · còn 58%')).toBeInTheDocument()
  })
})
