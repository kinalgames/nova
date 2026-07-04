import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'
import { fetchMonthUsage } from '../services/usage'

// the async usage hydrate resolves a microtask after mount; give waitFor
// headroom so this file stays green under the parallel projects run
configure({ asyncUtilTimeout: 5000 })

vi.mock('../services/usage', () => ({
  fetchMonthUsage: vi.fn(async () => null),
}))

vi.mock('../services/credentials', () => ({
  listCredentials: vi.fn(async () => []),
  addCredential: vi.fn(async () => null),
  patchCredential: vi.fn(async () => true),
  deleteCredential: vi.fn(async () => true),
  pingCredential: vi.fn(async () => 'active' as const),
}))

vi.mock('../services/sync', () => ({
  pullOps: vi.fn(async () => ({ seq: 0, ops: [] })),
  pushOps: vi.fn(async () => 1),
  startLiveSync: vi.fn(() => () => {}),
  SYNC_SRC: 'test-src',
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('nova.auth.token', 'tok')
  vi.mocked(fetchMonthUsage).mockClear()
  vi.mocked(fetchMonthUsage).mockResolvedValue(null)
})

describe('store — server month usage (T8)', () => {
  it('boot hydrates the server roll-up and Settings shows it over the local one', async () => {
    vi.mocked(fetchMonthUsage).mockResolvedValue([
      { providerId: 'openai', modelId: 'gpt-5.4-mini', kind: 'api_key', inTok: 1_000_000, outTok: 2_000_000 },
      { providerId: 'gemini', modelId: 'gemini-3.5-flash', kind: 'account', inTok: 500, outTok: 700 },
    ])
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() => expect(result.current.s.serverUsage).not.toBeNull())
    // 1M in @ $0.75 + 2M out @ $4.50 = $9.75; the account-kind row costs 0
    expect(result.current.v.monthUsage).toContain('$9.75')
    expect(result.current.v.monthUsage).toContain('↑')
  })

  it('falls back to the local roll-up when the endpoint is unavailable', async () => {
    const { result } = await renderStore({ world: 'real' })
    await waitFor(() => expect(fetchMonthUsage).toHaveBeenCalled())
    expect(result.current.s.serverUsage).toBeNull()
    // no local usage either in a fresh real world — the row stays empty
    expect(result.current.v.monthUsage).toBe('')
  })
})
