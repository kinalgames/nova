import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { addCredential, exchangeGeminiCode } from '../services/credentials'

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
  // D1 follow-up — the Gemini OAuth popup + exchange transport
  startGeminiOAuth: vi.fn(async () => 'https://accounts.google.com/o/oauth2/v2/auth'),
  exchangeGeminiCode: vi.fn(async () => ({
    ok: true,
    refreshToken: '1//exchanged-refresh',
    email: 'toi@gmail.com',
  })),
}))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(addCredential).mockClear()
})

const openProviders = () => renderApp(undefined, { path: '/chat/c1?settings=providers' })
const expand = async (user: ReturnType<typeof makeUser>, dialog: HTMLElement, name: string) =>
  user.click(within(dialog).getByRole('button', { name: `Mở cấu hình ${name}` }))

describe('Settings → Providers — accordion + profiles', () => {
  it('rows collapse to a summary; expanding one reveals its profiles', async () => {
    const user = makeUser()
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    // collapsed: summaries + status badges only — no profile rows yet
    expect(within(dialog).getAllByText('2 hồ sơ').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Chưa kết nối')).toBeInTheDocument() // gemini
    expect(within(dialog).queryByText('Cá nhân')).not.toBeInTheDocument()
    // expand Claude → its profiles + the in-use marker appear
    await expand(user, dialog, 'Claude')
    expect(within(dialog).getByText('Cá nhân')).toBeInTheDocument()
    expect(within(dialog).getByText('Dự phòng')).toBeInTheDocument()
    // the in-use marker is now the quiet ● next to the profile name
    expect(within(dialog).getAllByText('●').length).toBeGreaterThan(0)
    // accordion: opening ChatGPT closes Claude
    await expand(user, dialog, 'ChatGPT')
    expect(within(dialog).getByText('Khóa chính')).toBeInTheDocument()
    expect(within(dialog).queryByText('Cá nhân')).not.toBeInTheDocument()
  })

  // generous timeout: per-keystroke typing runs slower under coverage
  it('adds a profile via the form — the credential is sealed server-side', { timeout: 15_000 }, async () => {
    const user = makeUser()
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Gemini')
    // progressive disclosure: the form appears only after picking a path
    await user.click(within(dialog).getByRole('button', { name: 'Thêm khóa API — Gemini' }))
    await user.type(within(dialog).getByLabelText('API KEY — Gemini'), 'AIza-new-key-000')
    await user.click(within(dialog).getByRole('button', { name: 'Thêm hồ sơ — Gemini' }))
    // the secret went to the server once; the row returns with a hint
    expect(addCredential).toHaveBeenCalledWith('gemini', 'api_key', 'Khóa API', 'AIza-new-key-000')
    expect((await within(dialog).findAllByText('Chưa kiểm tra')).length).toBeGreaterThan(0)
    expect(within(dialog).getByText('…0-000')).toBeInTheDocument()
  })

  it('D1 follow-up — Gemini account kind runs the OAuth popup panel, not a manual paste', { timeout: 15_000 }, async () => {
    const user = makeUser()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Gemini')
    await user.click(within(dialog).getByRole('button', { name: 'Đăng nhập bằng tài khoản — Gemini' }))
    // no manual credential field for this path — only the open-Google button
    // and the paste-after-signin field
    expect(within(dialog).queryByLabelText('API KEY — Gemini')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Mở Google để đăng nhập' }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth',
      'nova-gemini-oauth',
      'width=480,height=640',
    )
    const paste = within(dialog).getByLabelText('Dán địa chỉ sau khi đăng nhập — Gemini')
    await user.type(
      paste,
      'http://localhost:58219/oauth2callback?state=x&code=4%2F0Ab_realcode&scope=email',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Thêm hồ sơ — Gemini' }))
    // no name field to fill in — the signed-in Google email becomes the
    // profile name automatically (never a token-tail hint the user can't read)
    await waitFor(() =>
      expect(addCredential).toHaveBeenCalledWith('gemini', 'account', 'toi@gmail.com', '1//exchanged-refresh'),
    )
    openSpy.mockRestore()
  })

  it('a failed exchange shows the reason under the paste field, in plain words', async () => {
    const user = makeUser()
    vi.mocked(exchangeGeminiCode).mockResolvedValueOnce({
      ok: false,
      code: 'oauth_exchange_failed',
      detail: 'invalid_grant: code already used',
    })
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    await openProviders()
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Gemini')
    await user.click(within(dialog).getByRole('button', { name: 'Đăng nhập bằng tài khoản — Gemini' }))
    await user.click(within(dialog).getByRole('button', { name: 'Mở Google để đăng nhập' }))
    await user.type(
      within(dialog).getByLabelText('Dán địa chỉ sau khi đăng nhập — Gemini'),
      'http://localhost:58219/oauth2callback?code=stale-code',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Thêm hồ sơ — Gemini' }))
    await waitFor(() =>
      expect(within(dialog).getByText(/invalid_grant: code already used/)).toBeInTheDocument(),
    )
    expect(addCredential).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('reorders priority with the arrows and removes a profile', async () => {
    const user = makeUser()
    const { store } = await openProviders()
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Claude')
    // secondary actions live behind the per-profile “…” menu now
    await user.click(within(dialog).getByRole('button', { name: 'Tùy chọn hồ sơ Cá nhân' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Giảm ưu tiên' }))
    expect(store().s.profiles.claude.map((f) => f.name)).toEqual(['Dự phòng', 'Cá nhân'])
    await user.click(within(dialog).getByRole('button', { name: 'Tùy chọn hồ sơ Dự phòng' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xóa hồ sơ' }))
    expect(store().s.profiles.claude.map((f) => f.name)).toEqual(['Cá nhân'])
  })

  it('the Trợ lý pickers assign slots per mode, with caps on every row', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/chat/c1?settings=assistant' })
    const dialog = await screen.findByRole('dialog')
    // the FAST picker lists fast-mode models; pick GPT-5.4 mini
    const miniFast = within(dialog).getByRole('radio', { name: 'Nhanh — GPT-5.4 mini' })
    expect(miniFast).toHaveAttribute('aria-checked', 'false')
    await user.click(miniFast)
    expect(miniFast).toHaveAttribute('aria-checked', 'true')
    expect(store().s.slots.fast).toEqual({ providerId: 'openai', modelId: 'gpt-5.4-mini' })
    // the previous fast model is unassigned now
    expect(
      within(dialog).getByRole('radio', { name: 'Nhanh — Claude Haiku 4.5' }),
    ).toHaveAttribute('aria-checked', 'false')
    // capability glyphs ride each row (reasoning on the curated catalog)
    expect(within(dialog).getAllByLabelText('Suy luận sâu').length).toBeGreaterThan(0)
    // smart-mode models never render in the fast group and vice versa
    expect(within(dialog).queryByRole('radio', { name: 'Nhanh — GPT-5' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: 'Thông minh — GPT-5.4 mini' })).not.toBeInTheDocument()
  })

  it('hydrated ollama models list in BOTH pickers with caps, free pricing and a\n     LEGACY badge sorting last', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, {
      path: '/chat/c1?settings=assistant',
      storeInit: {
        profiles: {
          claude: [{ id: 'p1', name: 'Khóa', kind: 'api_key', credential: 'sk-x', status: 'active' }],
          gemini: [],
          openai: [],
          ollama: [{ id: 'po', name: 'Máy này', kind: 'api_key', credential: 'http://localhost:11434', status: 'active' }],
        },
        ollamaModels: [
          { id: 'ornith:35b', name: 'ornith:35b', mode: 'fast', caps: { reasoning: true, vision: true }, ctx: 262_144, inPrice: 0, outPrice: 0 },
          { id: 'sd-turbo', name: 'sd-turbo', mode: 'fast', caps: { imageGen: true, audio: true }, ctx: 0, inPrice: 0, outPrice: 0, legacy: true },
        ],
      },
    })
    const dialog = await screen.findByRole('dialog')
    // both pickers carry the local model (mode does not gate dynamic models)
    expect(within(dialog).getByRole('radio', { name: 'Thông minh — ornith:35b' })).toBeInTheDocument()
    const localFast = within(dialog).getByRole('radio', { name: 'Nhanh — ornith:35b' })
    // free local pricing + ctx render on the row's meta
    expect(within(dialog).getAllByText(/262k ctx · Miễn phí/).length).toBeGreaterThan(0)
    // capability glyphs from the dynamic catalog (audio + image generation)
    expect(within(dialog).getAllByLabelText('Tạo ảnh').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByLabelText('Nghe âm thanh').length).toBeGreaterThan(0)
    // the LEGACY-flagged model badges and sorts last within its group
    expect(within(dialog).getAllByText('LEGACY').length).toBeGreaterThan(0)
    const fastNames = within(dialog)
      .getAllByRole('radio', { name: /^Nhanh —/ })
      .map((r) => r.getAttribute('aria-label'))
    expect(fastNames.indexOf('Nhanh — sd-turbo')).toBeGreaterThan(fastNames.indexOf('Nhanh — ornith:35b'))
    // picking the local model routes the slot to the dynamic id
    await user.click(localFast)
    expect(store().s.slots.fast).toEqual({ providerId: 'ollama', modelId: 'ornith:35b' })
  })

  it('a disconnected provider\u2019s models dim with a Connect CTA that jumps to its config', async () => {
    const user = makeUser()
    const { store } = await renderApp(undefined, { path: '/chat/c1?settings=assistant' })
    const dialog = await screen.findByRole('dialog')
    // gemini has no profile → its models are visible but not pickable
    expect(within(dialog).queryByRole('radio', { name: 'Nhanh — Gemini 3.5 Flash' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Gemini 3.5 Flash')).toBeInTheDocument()
    // the CTA lands on the Providers tab with gemini's config expanded
    await user.click(within(dialog).getAllByRole('button', { name: 'Kết nối — Gemini' })[0])
    expect(store().v.settingsTab).toBe('providers')
    expect(store().s.openProvider).toBe('gemini')
    // the config opens calm: two add paths, the form appears on pick
    await user.click(await within(dialog).findByRole('button', { name: 'Thêm khóa API — Gemini' }))
    expect(await within(dialog).findByLabelText('API KEY — Gemini')).toBeInTheDocument()
  })

  it('the ollama config lists its dynamic models and offers the pull form', async () => {
    const user = makeUser()
    await renderApp(undefined, {
      path: '/chat/c1?settings=providers',
      storeInit: {
        ollamaModels: [
          { id: 'ornith:35b', name: 'ornith:35b', mode: 'fast', caps: { reasoning: true }, ctx: 262_144, inPrice: 0, outPrice: 0, size: '19.7 GB' },
        ],
      },
    })
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Trên máy của bạn')
    // the installed model renders with its size badge + caps glyph
    expect(within(dialog).getByText('ornith:35b')).toBeInTheDocument()
    expect(within(dialog).getByText('19.7 GB')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Làm mới' })).toBeInTheDocument()
    // the pull form guards empty input
    const pull = within(dialog).getByRole('button', { name: 'Tải model' })
    expect(pull).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Tên model cần tải'), 'llama3.2')
    expect(pull).toBeEnabled()
  })

  it('an in-flight pull replaces the form with a progress line', async () => {
    const user = makeUser()
    await renderApp(undefined, {
      path: '/chat/c1?settings=providers',
      storeInit: { ollamaPull: { model: 'llama3.2', pct: 40, status: 'downloading' } },
    })
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Trên máy của bạn')
    expect(within(dialog).getByRole('status')).toHaveTextContent('llama3.2')
    expect(within(dialog).getByRole('status')).toHaveTextContent('40%')
    expect(within(dialog).getByRole('status')).toHaveTextContent('downloading')
    expect(within(dialog).queryByRole('button', { name: 'Tải model' })).not.toBeInTheDocument()
  })

  it('a pull whose layer sizes are unknown shows … instead of a percentage', async () => {
    const user = makeUser()
    await renderApp(undefined, {
      path: '/chat/c1?settings=providers',
      storeInit: { ollamaPull: { model: 'qwen3', pct: null, status: '' } },
    })
    const dialog = await screen.findByRole('dialog')
    await expand(user, dialog, 'Trên máy của bạn')
    expect(within(dialog).getByRole('status')).toHaveTextContent('…%')
    // refresh survives an unreachable endpoint — the button simply re-asks
    await user.click(within(dialog).getByRole('button', { name: 'Làm mới' }))
    expect(within(dialog).getByRole('button', { name: 'Làm mới' })).toBeInTheDocument()
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
