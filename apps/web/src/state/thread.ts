import type { Message } from './types'

/**
 * A conversation is a TREE of messages: editing a user message or regenerating
 * a reply adds a SIBLING branch, and the visible conversation is the path that
 * follows the selected child at every fork (the modern ChatGPT/Claude model).
 *
 * Stored flat for cheap updates and easy persistence:
 * - `byId`      — every message ever created
 * - `children`  — child ids per parent id (ROOT = '' for top-level), in
 *                 creation order (order == version numbering)
 * - `selected`  — which child is active at a fork; absent = the newest child
 */
export interface Thread {
  byId: Record<string, Message>
  children: Record<string, string[]>
  selected: Record<string, string>
}

const ROOT = ''
const keyOf = (parentId: string | undefined) => parentId ?? ROOT

export const emptyThread = (): Thread => ({ byId: {}, children: {}, selected: {} })

/** the active child at a fork (explicit selection, else the newest) */
function activeChild(t: Thread, parentKey: string): string | undefined {
  const ids = t.children[parentKey]
  if (!ids || ids.length === 0) return undefined
  const sel = t.selected[parentKey]
  return sel && ids.includes(sel) ? sel : ids[ids.length - 1]
}

/** the conversation the user currently sees: follow selections root → leaf */
export function visiblePath(t: Thread): Message[] {
  const path: Message[] = []
  let key = ROOT
  for (;;) {
    const id = activeChild(t, key)
    if (!id) return path
    path.push(t.byId[id])
    key = id
  }
}

/** the last message of the visible path (undefined for an empty thread) */
export function visibleLeaf(t: Thread): Message | undefined {
  const path = visiblePath(t)
  return path[path.length - 1]
}

/** append `msg` under `parentId` (undefined = root) and select it */
export function appendChild(t: Thread, parentId: string | undefined, msg: Message): Thread {
  const key = keyOf(parentId)
  const withParent: Message = { ...msg, parentId }
  return {
    byId: { ...t.byId, [msg.id]: withParent },
    children: { ...t.children, [key]: [...(t.children[key] ?? []), msg.id] },
    selected: { ...t.selected, [key]: msg.id },
  }
}

/** append to the end of the visible conversation */
export function appendToLeaf(t: Thread, msg: Message): Thread {
  return appendChild(t, visibleLeaf(t)?.id, msg)
}

/** add `msg` as a new VERSION (sibling) of an existing message and select it */
export function addSibling(t: Thread, siblingOfId: string, msg: Message): Thread {
  const of = t.byId[siblingOfId]
  if (!of) return t
  return appendChild(t, of.parentId, msg)
}

/** move the selection at a message's fork by ±1 (clamped) */
export function selectSibling(t: Thread, messageId: string, delta: number): Thread {
  const m = t.byId[messageId]
  if (!m) return t
  const key = keyOf(m.parentId)
  const ids = t.children[key] ?? []
  const current = activeChild(t, key)
  const i = current ? ids.indexOf(current) : -1
  const next = ids[Math.min(ids.length - 1, Math.max(0, i + delta))]
  if (!next || next === current) return t
  return { ...t, selected: { ...t.selected, [key]: next } }
}

/** 1-based version position of a message among its siblings */
export function siblingInfo(t: Thread, messageId: string): { index: number; count: number } {
  const m = t.byId[messageId]
  if (!m) return { index: 1, count: 1 }
  const ids = t.children[keyOf(m.parentId)] ?? []
  return { index: Math.max(1, ids.indexOf(messageId) + 1), count: Math.max(1, ids.length) }
}

/** shallow-patch one message */
export function updateMessage(t: Thread, id: string, patch: Partial<Message>): Thread {
  const m = t.byId[id]
  if (!m) return t
  return { ...t, byId: { ...t.byId, [id]: { ...m, ...patch } } }
}

/** build a tree from a plain linear conversation (seed/authoring format) */
export function fromLinear(messages: Message[]): Thread {
  let t = emptyThread()
  let parent: string | undefined
  for (const m of messages) {
    t = appendChild(t, parent, m)
    parent = m.id
  }
  return t
}
