import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '../test/util'
import { fetchShare } from '../services/share'

vi.mock('../services/share', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/share')>()),
  fetchShare: vi.fn(async () => ({
    title: 'Kế hoạch Aurora',
    createdAt: '2026-07-03',
    messages: [
      { role: 'user' as const, who: 'THÀNH', text: 'phân tích giúp mình' },
      {
        role: 'assistant' as const,
        who: 'NOVA',
        text: 'Đây là phân tích…',
        files: [
          { fileId: 'f9', name: 'chart.png', kind: 'image' },
          { name: 'plan.pdf', kind: 'pdf' },
        ],
      },
    ],
  })),
}))

describe('/share/:id — public read-only page', () => {
  it('renders the frozen transcript with real images and the Nova CTA', async () => {
    await renderApp(undefined, { path: '/share/abc123' })
    expect(await screen.findByText('Kế hoạch Aurora')).toBeInTheDocument()
    expect(screen.getByText('THÀNH')).toBeInTheDocument()
    expect(screen.getByText('phân tích giúp mình')).toBeInTheDocument()
    const img = screen.getByAltText('chart.png')
    expect(img.getAttribute('src')).toContain('/v1/shares/abc123/files/f9')
    expect(screen.getByText('Dùng thử Nova')).toBeInTheDocument()
    // non-image files render as plain pills — no bytes exposed
    expect(screen.getByText('plan.pdf')).toBeInTheDocument()
    // unlisted — noindex while mounted
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex',
    )
  })

  it('a dead or revoked link shows the friendly not-found screen', async () => {
    vi.mocked(fetchShare).mockResolvedValueOnce(null)
    await renderApp(undefined, { path: '/share/dead' })
    await waitFor(() =>
      expect(screen.getByText('Liên kết không tồn tại')).toBeInTheDocument(),
    )
  })
})
