// Conversation organization helpers (Track B): date grouping for the recents
// list and export serializers. Pure functions — the store wires them up.

import type { Conversation, Message } from './types'
import type { Thread } from './thread'
import { visiblePath } from './thread'

export type GroupId = 'pinned' | 'today' | 'yesterday' | 'week' | 'older'

export interface ConvGroup<T> {
  id: GroupId
  items: T[]
}

const DAY_MS = 86_400_000

/** local-midnight timestamp for a given moment */
function dayStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Group conversations for the sidebar: pinned first, then by calendar day of
 * their last activity. A conversation without `updatedAt` (data predating the
 * field) lands in 'older' — real activity moves it forward naturally.
 * Within each group the input order is preserved; empty groups are omitted.
 */
export function groupConvs<T extends Pick<Conversation, 'pinned' | 'updatedAt'>>(
  convs: T[],
  now: number = Date.now(),
): ConvGroup<T>[] {
  const today = dayStart(now)
  const yesterday = today - DAY_MS
  const weekAgo = today - 6 * DAY_MS
  const buckets: Record<GroupId, T[]> = { pinned: [], today: [], yesterday: [], week: [], older: [] }
  for (const c of convs) {
    if (c.pinned) buckets.pinned.push(c)
    else if (c.updatedAt == null) buckets.older.push(c)
    else if (c.updatedAt >= today) buckets.today.push(c)
    else if (c.updatedAt >= yesterday) buckets.yesterday.push(c)
    else if (c.updatedAt >= weekAgo) buckets.week.push(c)
    else buckets.older.push(c)
  }
  return (Object.keys(buckets) as GroupId[])
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, items: buckets[id] }))
}

/** flatten a message's text blocks into plain markdown paragraphs */
function textOf(m: Message): string {
  return m.blocks
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n\n')
}

/** serialize the visible path of a conversation as a portable .md document */
export function exportMarkdown(conv: Conversation, thread: Thread | undefined): string {
  const lines: string[] = [`# ${conv.title}`, '']
  for (const m of thread ? visiblePath(thread) : []) {
    lines.push(`## ${m.who}`, '', textOf(m), '')
  }
  return lines.join('\n')
}

/** serialize the FULL thread tree (all versions) as .json — lossless */
export function exportJson(conv: Conversation, thread: Thread | undefined): string {
  return JSON.stringify({ version: 1, conversation: conv, thread: thread ?? null }, null, 2)
}

/** a filesystem-safe filename from a conversation title */
export function exportFilename(title: string, ext: 'md' | 'json'): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60) || 'conversation'
  return `${safe}.${ext}`
}
