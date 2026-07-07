// Optimistic conversation delete: flag it, then remove for real after a 5s
// undo window so an accidental delete is recoverable. Deleting a
// conversation deletes EVERY ref it holds — server-side attachments (R2
// bytes + D1 rows, fail-soft), session object URLs, its staged tray, and
// a live share — nothing may leak.

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { HAS_API } from '../services/llm'
import { deleteFile } from '../services/upload'
import { revokeShare } from '../services/share'
import { abortedUploads, type NavState, type Updater } from './store-helpers'
import type { NovaState } from './types'

export function useConversationDelete(
  sRef: RefObject<NovaState>,
  navRef: RefObject<NavState>,
  set: (u: Updater) => void,
  goTo: (to: string, params?: Record<string, string>) => void,
) {
  // owned here (not accepted as a prop) so the mutations below stay inside
  // the hook that created it — a ref mutated from OUTSIDE the hook that
  // useRef'd it is exactly what the immutability rule flags
  const delTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const delConv = useCallback(
    (id: string) => {
      set((x) => ({ deleting: x.deleting.includes(id) ? x.deleting : [...x.deleting, id] }))
      clearTimeout(delTimers.current[id])
      delTimers.current[id] = setTimeout(() => {
        delete delTimers.current[id]
        const next = sRef.current.conversations.filter((k) => k.id !== id)[0]?.id ?? ''
        // a live share dies with its conversation (fail-soft)
        const shared = sRef.current.conversations.find((k) => k.id === id)?.shareId
        if (shared && HAS_API) void revokeShare(shared)
        const th = sRef.current.threads[id]
        if (th) {
          for (const m of Object.values(th.byId)) {
            for (const b of m.blocks) {
              if (b.type !== 'files') continue
              for (const f of b.items) {
                if (f.fileId && HAS_API) void deleteFile(f.fileId)
                if (f.url?.startsWith('blob:')) URL.revokeObjectURL(f.url)
              }
            }
          }
        }
        for (const f of sRef.current.staged[id] ?? []) {
          if (f.url?.startsWith('blob:')) URL.revokeObjectURL(f.url)
          // uploaded-but-never-sent tray files die with the conversation too;
          // in-flight ones delete themselves when they land
          if (f.fileId && HAS_API) void deleteFile(f.fileId)
          if (f.progress !== undefined) abortedUploads.add(f.id)
        }
        set((x) => {
          const conversations = x.conversations.filter((k) => k.id !== id)
          const threads = { ...x.threads }
          delete threads[id]
          const staged = { ...x.staged }
          delete staged[id]
          return {
            conversations,
            threads,
            staged,
            activeConv: x.activeConv === id ? next : x.activeConv,
            deleting: x.deleting.filter((d) => d !== id),
            // an error card pinned to the deleted conversation dies with it
            ...(x.errorConv === id
              ? { errorDetail: null, errorRequestId: null, errorAction: null, errorConv: null }
              : {}),
          }
        })
        // if the deleted conversation is the one in the URL, leave it
        if (navRef.current.activeConv === id) {
          if (next) goTo('/chat/$convId', { convId: next })
          else goTo('/new')
        }
      }, 5000)
    },
    [sRef, navRef, delTimers, set, goTo],
  )

  const undoDelete = useCallback(
    (id: string) => {
      clearTimeout(delTimers.current[id])
      delete delTimers.current[id]
      set((x) => ({ deleting: x.deleting.filter((d) => d !== id) }))
    },
    [delTimers, set],
  )

  // a pending delete's setTimeout must not fire after this hook's owner unmounts
  useEffect(
    () => () => {
      Object.values(delTimers.current).forEach((t) => clearTimeout(t))
    },
    [delTimers],
  )

  return { delConv, undoDelete }
}
