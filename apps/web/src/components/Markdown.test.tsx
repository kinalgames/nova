import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { fromLinear } from '../state/thread'
import type { Message } from '../state/types'

vi.mock('../services/highlight', () => ({
  highlight: async (code: string) => `<pre data-testid="shiki"><code>${code}</code></pre>`,
}))

beforeEach(() => localStorage.clear())

const nova = (text: string): Message => ({
  id: 'md1',
  role: 'assistant',
  who: 'NOVA',
  blocks: [{ type: 'text', text }],
})

const seedConv = (text: string) => async () =>
  renderApp((s) => s.set({ activeConv: 'c1', threads: { c1: fromLinear([nova(text)]) } }))

const FULL_MD = [
  '# Tiêu đề lớn',
  '',
  '## Kế hoạch',
  '',
  '### Mục nhỏ',
  '',
  'Điểm **quan trọng** với `npm run dev`.',
  '',
  '- Bước một',
  '- Bước hai',
  '',
  '1. Đầu tiên',
  '2. Sau đó',
  '',
  '> Trích dẫn nguồn',
  '',
  '| Cột A | Cột B |',
  '| --- | --- |',
  '| x1 | y1 |',
  '',
  '[Tài liệu](https://example.com)',
].join('\n')

// The lazy Markdown chunk loads slowly under coverage instrumentation AND
// under the parallel projects run — the findBy wait must not race the test's
// own timeout, so both are widened together.
const SLOW = { timeout: 10_000 }
const TEST_TIMEOUT = 15_000

describe('markdown rendering in text blocks', () => {
  it(
    'renders headings, emphasis, lists, blockquote, GFM table and links',
    async () => {
      await seedConv(FULL_MD)()

      expect(await screen.findByText('Tiêu đề lớn', undefined, SLOW)).toBeInTheDocument()
      expect(screen.getByText('Kế hoạch')).toBeInTheDocument()
      expect(screen.getByText('Mục nhỏ')).toBeInTheDocument()
      expect(screen.getByText('quan trọng')).toBeInTheDocument()
      expect(screen.getByText('npm run dev')).toBeInTheDocument()
      expect(screen.getByText('Bước một')).toBeInTheDocument()
      expect(screen.getByText('Sau đó')).toBeInTheDocument()
      expect(screen.getByText('Trích dẫn nguồn')).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Cột A' })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: 'x1' })).toBeInTheDocument()

      const link = screen.getByRole('link', { name: 'Tài liệu' })
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('target', '_blank')
    },
    TEST_TIMEOUT,
  )

  it(
    'renders a code fence as a card — language header, highlight, working copy',
    async () => {
      const user = makeUser()
      // after makeUser(): userEvent.setup() installs its own clipboard stub,
      // so ours must be defined later to win
      const write = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: write },
        configurable: true,
      })
      await seedConv('Chạy thử:\n\n```ts\nconst x = 1\n```')()

      expect(await screen.findByText('ts', undefined, SLOW)).toBeInTheDocument()
      expect(await screen.findByTestId('shiki')).toBeInTheDocument()
      expect(screen.getByTestId('shiki')).toHaveTextContent('const x = 1')

      await user.click(screen.getByText('Sao chép'))
      expect(write).toHaveBeenCalledWith('const x = 1')
      expect(await screen.findByText('Đã chép')).toBeInTheDocument()
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps short inline code out of the card treatment',
    async () => {
      await seedConv('Gõ `ls -la` để xem.')()
      const inline = await screen.findByText('ls -la', undefined, SLOW)
      expect(inline.tagName).toBe('CODE')
      expect(screen.queryByTestId('shiki')).not.toBeInTheDocument()
    },
    TEST_TIMEOUT,
  )
})
