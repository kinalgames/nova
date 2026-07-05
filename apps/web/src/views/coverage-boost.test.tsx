import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '../test/util'
import { fromLinear } from '../state/thread'

beforeEach(() => localStorage.clear())

describe('conversation — appended messages & typing', () => {
  it('renders sent user + Nova messages and the typing indicator', async () => {
    await renderApp((s) =>
      s.set({
        activeConv: 'c1',
        threads: {
          c1: fromLinear([
            { id: 'b1', role: 'user', who: 'THÀNH', blocks: [{ type: 'text', text: 'Câu hỏi của mình' }] },
            { id: 'b2', role: 'assistant', who: 'NOVA', blocks: [{ type: 'text', text: 'Nova trả lời đây' }] },
          ]),
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
    const { container } = await renderApp((s) => s.set({ accent: '#3B5BA9' }))
    expect(await screen.findByRole('textbox', { name: 'Nhắn cho Nova' })).toBeInTheDocument()
    const root = container.querySelector('#root > div, div')
    expect((root as HTMLElement | null)?.style.getPropertyValue('--accent')).toBe('#3B5BA9')
  })
})

describe('preview — uploaded image (object URL)', () => {
  it('renders an <img> when the preview carries a url', async () => {
    await renderApp((s) =>
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
    // the showcase conversation carries no usage yet — the meter must show
    // the REAL zero, never a placeholder-shaped fake count
    await renderApp()
    const meter = await screen.findByRole('button', { name: /0 vào · 0 ra/ })
    expect(meter).toBeInTheDocument()
    meter.focus()
    expect(await screen.findByText('0 vào · 0 ra · chưa tốn phí')).toBeInTheDocument()
  })
})
