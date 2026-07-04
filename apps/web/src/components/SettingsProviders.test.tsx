import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { addCredential } from '../services/credentials'

// the real product seals credentials server-side (BE3) — mock the transport
// so the form flow runs against a deterministic server row
vi.mock('../services/credentials', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/credentials')>()),
  addCredential: vi.fn(async (_p: string, kind: string, name: string) => ({
    id: 'srv-c1',
    providerId: 'gemini',
    kind,
    name,
    hint: '…0-000',
    status: 'untested' as const,
  })),
  // boot hydration behaves like the hermetic 503 — keep the fixture profiles
  listCredentials: vi.fn(async () => null),
}))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(addCredential).mockClear()
})

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
    // model rows carry their catalog names (ollama's catalog is dynamic —
    // nothing hardcoded to assert there)
    expect(within(dialog).getByText('Claude Opus 4.8')).toBeInTheDocument()
  })

  // generous timeout: per-keystroke typing runs slower under coverage
  it('adds a profile via the form — the credential is sealed server-side', { timeout: 15_000 }, async () => {
    const user = makeUser()
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('API KEY — Gemini'), 'AIza-new-key-000')
    await user.click(within(dialog).getByRole('button', { name: 'Thêm hồ sơ — Gemini' }))
    // the secret went to the server once (the form's default kind for gemini
    // is the account segment); the row returns with a hint
    expect(addCredential).toHaveBeenCalledWith('gemini', 'account', 'Tài khoản', 'AIza-new-key-000')
    expect((await within(dialog).findAllByText('Chưa kiểm tra')).length).toBeGreaterThan(0)
    expect(within(dialog).getByText('…0-000')).toBeInTheDocument()
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
