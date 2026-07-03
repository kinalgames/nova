// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { exportFilename, exportJson, exportMarkdown, groupConvs } from './organize'
import { fromLinear } from './thread'
import type { Conversation, Message } from './types'

// a fixed "now": Wed 2026-07-01 15:00 local
const NOW = new Date(2026, 6, 1, 15, 0, 0).getTime()
const HOUR = 3_600_000
const DAY = 24 * HOUR

const conv = (id: string, updatedAt?: number, pinned?: boolean): Conversation => ({
  id,
  title: id,
  projectId: 'chung',
  updatedAt,
  pinned,
})

describe('groupConvs — date-grouped recents', () => {
  it('splits pinned / today / yesterday / week / older and skips empty groups', () => {
    const groups = groupConvs(
      [
        conv('pin', NOW - 30 * DAY, true),
        conv('today', NOW - 2 * HOUR),
        conv('yesterday', NOW - 20 * HOUR), // 19:00 the day before
        conv('week', NOW - 4 * DAY),
        conv('older', NOW - 12 * DAY),
        conv('legacy', undefined), // predates the updatedAt field
      ],
      NOW,
    )
    expect(groups.map((g) => g.id)).toEqual(['pinned', 'today', 'yesterday', 'week', 'older'])
    expect(groups.find((g) => g.id === 'pinned')?.items.map((c) => c.id)).toEqual(['pin'])
    expect(groups.find((g) => g.id === 'older')?.items.map((c) => c.id)).toEqual([
      'older',
      'legacy',
    ])
  })

  it('a conversation at 00:00 today still counts as today', () => {
    const midnight = new Date(2026, 6, 1, 0, 0, 0).getTime()
    expect(groupConvs([conv('m', midnight)], NOW)[0].id).toBe('today')
  })

  it('all-in-one-group input yields a single group', () => {
    const groups = groupConvs([conv('a', NOW), conv('b', NOW - HOUR)], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('today')
  })
})

const msg = (id: string, role: Message['role'], text: string): Message => ({
  id,
  role,
  who: role === 'user' ? 'THÀNH' : 'NOVA',
  blocks: [{ type: 'text', text }],
})

describe('export serializers', () => {
  const c: Conversation = { id: 'x', title: 'Kế hoạch Đà Lạt', projectId: 'chung' }
  const thread = fromLinear([msg('u1', 'user', 'Câu hỏi'), msg('a1', 'assistant', 'Trả lời')])

  it('markdown carries the title and the visible exchange', () => {
    const md = exportMarkdown(c, thread)
    expect(md).toContain('# Kế hoạch Đà Lạt')
    expect(md).toContain('## THÀNH')
    expect(md).toContain('Câu hỏi')
    expect(md).toContain('## NOVA')
    expect(md).toContain('Trả lời')
  })

  it('markdown of a conversation without a thread is just the title', () => {
    expect(exportMarkdown(c, undefined).trim()).toBe('# Kế hoạch Đà Lạt')
  })

  it('json is lossless — full tree, parseable', () => {
    const parsed = JSON.parse(exportJson(c, thread))
    expect(parsed.conversation.id).toBe('x')
    expect(Object.keys(parsed.thread.byId)).toEqual(['u1', 'a1'])
  })

  it('json of a conversation without a thread carries an explicit null', () => {
    expect(JSON.parse(exportJson(c, undefined)).thread).toBeNull()
  })

  it('filenames strip unsafe characters and cap length', () => {
    expect(exportFilename('Kế hoạch: "Q3" <bản cuối>?', 'md')).toBe('Kế hoạch Q3 bản cuối.md')
    expect(exportFilename('', 'json')).toBe('conversation.json')
  })
})