import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'

beforeEach(() => localStorage.clear())

const openProviders = () => renderApp(undefined, { path: '/chat/c1?settings=providers' })

describe('Settings → Providers — profiles, slots, rotation', () => {
  it('lists seeded profiles with kind, status and the in-use marker', async () => {
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Cá nhân')).toBeInTheDocument()
    expect(within(dialog).getByText('Dự phòng')).toBeInTheDocument()
    // every connected provider marks the profile rotation would use
    expect(within(dialog).getAllByText(/đang dùng/).length).toBeGreaterThan(0)
    // gemini has no profiles yet
    expect(within(dialog).getByText('Chưa kết nối')).toBeInTheDocument()
    // model rows carry pricing; local models are free
    expect(within(dialog).getAllByText('Miễn phí').length).toBeGreaterThan(0)
  })

  // generous timeout: per-keystroke typing + the 900ms fake connection test
  // run slower under coverage instrumentation
  it('adds a profile via the form and a test marks it active', { timeout: 15_000 }, async () => {
    const user = makeUser()
    // optimistic local addProfile + fake connection test live in the demo world
    // (the real product seals the credential server-side — store.credentials)
    await renderApp(undefined, { world: 'demo', path: '/chat/c1?settings=providers' })
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('API KEY — Gemini'), 'AIza-new-key-000')
    await user.click(within(dialog).getByRole('button', { name: 'Thêm hồ sơ — Gemini' }))
    expect(within(dialog).getAllByText('Chưa kiểm tra').length).toBeGreaterThan(0)

    await user.click(within(dialog).getByRole('button', { name: /Kiểm tra — Tài khoản/ }))
    await waitFor(
      () => expect(within(dialog).queryAllByText('Chưa kiểm tra')).toHaveLength(0),
      { timeout: 2500 },
    )
  })

  it('reorders priority with the arrows and removes a profile', async () => {
    const user = makeUser()
    const { store } = await openProviders()
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Giảm ưu tiên Cá nhân' }))
    expect(store().s.profiles.claude.map((f) => f.name)).toEqual(['Dự phòng', 'Cá nhân'])
    await user.click(within(dialog).getByRole('button', { name: 'Xóa hồ sơ Dự phòng' }))
    expect(store().s.profiles.claude.map((f) => f.name)).toEqual(['Cá nhân'])
  })

  it('assigns a slot to a cross-provider model from the models list', async () => {
    const user = makeUser()
    const { store } = await openProviders()
    const dialog = await screen.findByRole('dialog')
    const miniFast = within(dialog).getByRole('button', { name: 'Nhanh — GPT-5 mini' })
    expect(miniFast).toHaveAttribute('aria-pressed', 'false')
    await user.click(miniFast)
    expect(miniFast).toHaveAttribute('aria-pressed', 'true')
    expect(store().s.slots.fast).toEqual({ providerId: 'openai', modelId: 'gpt-5-mini' })
    // the previous fast model is unassigned now
    expect(
      within(dialog).getByRole('button', { name: 'Nhanh — Claude Haiku 4.5' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('a provider without a usable profile cannot be routed to (approved spec)', async () => {
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: 'Nhanh — Gemini 2.5 Flash' }),
    ).toBeDisabled()
    expect(
      within(dialog).getByText('Thêm hồ sơ kết nối để dùng model của nhà cung cấp này.'),
    ).toBeInTheDocument()
  })

  it('toggles auto-rotate', async () => {
    const user = makeUser()
    const { store } = await openProviders()
    const dialog = await screen.findByRole('dialog')
    const sw = within(dialog).getByRole('switch', { name: 'Tự xoay vòng hồ sơ' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(sw)
    expect(store().s.autoRotate).toBe(false)
  })
})

describe('TopBar — model menu routes slots', () => {
  it('shows [provider icon][model name] per slot and switches the active slot', async () => {
    const user = makeUser()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Chế độ trả lời: Thông minh' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Claude Opus 4.8')).toBeInTheDocument()
    expect(within(menu).getByText('Claude Haiku 4.5')).toBeInTheDocument()
    await user.click(within(menu).getByText('Nhanh'))
    expect(
      await screen.findByRole('button', { name: 'Chế độ trả lời: Nhanh' }),
    ).toBeInTheDocument()
  })
})
