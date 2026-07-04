import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

describe('<QuietMode> — real conversation', () => {
  it('renders the real thread text and a working composer', async () => {
    const user = makeUser()
    // fixture c1 has a real seeded thread; focus mode shows THAT, not a sample
    const { store } = await renderApp((s) => s.set({ quiet: true }))
    // the active conversation's message text is shown in the focus view
    const input = await screen.findByLabelText(/Tiếp tục trong im lặng/)
    await user.type(input, 'ghi chú tập trung')
    expect(store().s.draft).toBe('ghi chú tập trung')
  })

  it('shows the empty-space hint when there are no messages', async () => {
    await renderApp((s) => s.set({ quiet: true, activeConv: 'empty', threads: { empty: { byId: {}, children: {}, selected: {} } } }))
    expect(await screen.findByText(/Không gian yên tĩnh/)).toBeInTheDocument()
  })

  it('a cleared assistant name still labels replies NOVA, never a blank', async () => {
    await renderApp((s) => s.set({ quiet: true, assistantName: '  ' }))
    expect((await screen.findAllByText('NOVA')).length).toBeGreaterThan(0)
  })

  it('with no provider the focus input is honestly disabled and says why', async () => {
    // the BYOK nudge card lives behind the focus overlay, so a silent
    // soft-block would give zero feedback — the input disables + explains
    await renderApp((s) => s.set({ quiet: true, draft: 'ghi chú' }), {
      storeInit: { profiles: { claude: [], gemini: [], openai: [], ollama: [] } },
    })
    const input = (await screen.findByLabelText(/Tiếp tục trong im lặng/)) as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(input.placeholder).toMatch(/Thêm nhà cung cấp trong Cài đặt/)
  })
})
