import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderStore } from '../test/util'
import { pullOps, pushOps } from '../services/sync'
import { __resetSync } from './store'
import type { SyncOp } from '@nova/shared'

vi.mock('../services/sync', () => ({
  pullOps: vi.fn(async () => ({ seq: 0, ops: [] as SyncOp[] })),
  pushOps: vi.fn(async () => 1),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('nova.auth.token', 'tok') // syncReady() = true
  __resetSync()
  vi.mocked(pullOps).mockClear()
  vi.mocked(pushOps).mockClear()
})
afterEach(() => vi.useRealTimers())

describe('store — op-log sync wiring (BE2)', () => {
  it('hydrates from server records on boot (server wins)', async () => {
    vi.mocked(pullOps).mockResolvedValueOnce({
      seq: 2,
      ops: [
        { kind: 'put', table: 'settings', id: 'settings', value: { theme: 'dark', userName: 'Từ Server' }, at: 1 },
        { kind: 'put', table: 'conversation', id: 'c1', value: { id: 'c1', title: 'Đồng bộ về', projectId: 'chung' }, at: 2 },
      ],
    })
    const { result } = await renderStore()
    await waitFor(() => expect(result.current.s.theme).toBe('dark'))
    expect(result.current.s.userName).toBe('Từ Server')
    expect(result.current.s.conversations.find((c) => c.id === 'c1')?.title).toBe('Đồng bộ về')
  })

  it('a partial pull (no settings record) keeps every local default', async () => {
    vi.mocked(pullOps).mockResolvedValueOnce({
      seq: 1,
      ops: [
        {
          kind: 'put',
          table: 'thread',
          id: 'c9',
          value: { byId: {}, children: {}, selected: {} },
          at: 1,
        },
      ],
    })
    const { result } = await renderStore()
    await waitFor(() => expect(result.current.s.threads.c9).toBeDefined())
    // no settings record → local defaults untouched, seeded data intact
    expect(result.current.s.theme).toBe('light')
    expect(result.current.s.userName).toBe('Minh Trần')
    expect(result.current.s.conversations.length).toBeGreaterThan(0)
  })

  it('an empty server receives the full local import push', async () => {
    const { result } = await renderStore()
    await waitFor(() => expect(pushOps).toHaveBeenCalled())
    const ops = vi.mocked(pushOps).mock.calls[0][0]
    const keys = ops.map((o) => `${o.table}:${o.id}`)
    expect(keys).toContain('settings:settings')
    expect(keys).toContain('conversation:c1')
    expect(keys).toContain('thread:c1')
    expect(result.current.s.conversations.length).toBeGreaterThan(0)
  })

  it('later changes push only the debounced diff', async () => {
    const { result } = await renderStore()
    await waitFor(() => expect(pushOps).toHaveBeenCalled()) // initial import
    vi.mocked(pushOps).mockClear()

    await act(async () => result.current.v.setDark())
    await act(async () => new Promise((r) => setTimeout(r, 900))) // debounce window
    await waitFor(() => expect(pushOps).toHaveBeenCalled())
    const ops = vi.mocked(pushOps).mock.calls[0][0]
    expect(ops.some((o) => o.table === 'settings')).toBe(true)
    // untouched collections are not re-sent
    expect(ops.some((o) => o.table === 'thread')).toBe(false)
  })
})
