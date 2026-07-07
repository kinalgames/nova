// BE2/B7 — multi-device sync: persist locally, diff-push local changes to
// the per-user op-log (debounced), pull/apply remote batches, and keep one
// hibernating WebSocket open for live frames. Split out of StoreProvider —
// this is the single most tangled domain in the old store.tsx (shared
// module-level mirror state read/written from three different effects), so
// it stays as ONE cohesive hook rather than fragmenting the mirror's
// invariants across files.
//
// hydrateSync is RETURNED (not stashed in a module-level trigger pointer,
// which is what the pre-extraction code did) — the login/signup flow now
// calls it directly through the same `extra` plumbing every other
// StoreProvider-owned callback already rides.

import { useCallback, useEffect, type RefObject } from 'react'
import { HAS_API } from '../services/llm'
import { getToken } from '../services/auth'
import { pullOps, pushOps, startLiveSync, SYNC_SRC } from '../services/sync'
import { diffRecords, fromRecords, toRecords, type SyncRecord } from './syncmap'
import { sanitizeThreads } from './thread'
import { PERSIST_KEY } from './persist'
import type { NovaState } from './types'
import { mergeMirror, persistSliceOf, type Updater } from './store-helpers'
import type { SyncOp } from '@nova/shared'

// module-level because there is a single store instance. `synced` mirrors
// what the server holds so each persist push sends only the diff.
let syncedRecords: SyncRecord[] | null = null
let syncPushTimer: ReturnType<typeof setTimeout> | undefined
// the op-log position this client has fully applied; frames whose `from`
// matches apply in place, anything ahead triggers a delta pull
let syncCursor = 0
let syncPullInFlight = false
const syncReady = () => Boolean(HAS_API && getToken())

/** test-only: reset the module-level sync mirror between renders */
export function __resetSync() {
  syncedRecords = null
  syncCursor = 0
  syncPullInFlight = false
  clearTimeout(syncPushTimer)
}

export function useSyncEngine(s: NovaState, sRef: RefObject<NovaState>, set: (u: Updater) => void) {
  // persist a slice of settings
  useEffect(() => {
    // sRef (not s) so the dependency list stays the explicit persisted fields
    const p = persistSliceOf(sRef.current)
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(p))
    } catch {
      /* ignore */
    }
    // mirror the change to the per-user op-log (debounced diff push). Only
    // after the boot pull primed `syncedRecords` — never race hydration.
    if (syncReady() && syncedRecords !== null) {
      clearTimeout(syncPushTimer)
      const snapshot = p
      syncPushTimer = setTimeout(() => {
        const next = toRecords(snapshot)
        const ops = diffRecords(syncedRecords ?? [], next)
        if (ops.length === 0) return
        void pushOps(ops).then((seq) => {
          if (seq !== null) {
            syncedRecords = next
            syncCursor = Math.max(syncCursor, seq)
          }
        })
      }, 800)
    }
  }, [
    sRef,
    s.theme,
    s.advanced,
    s.accent,
    s.userName,
    s.userEmail,
    s.accountId,
    s.assistantName,
    s.focusDur,
    s.barOn,
    s.thinkingLevel,
    s.activeSlot,
    s.slots,
    s.profiles,
    s.autoRotate,
    s.stickyProfile,
    s.tools,
    s.styles,
    s.systemPrompt,
    s.projects,
    s.presetDefault,
    s.conversations,
    s.activeConv,
    s.threads,
  ])

  // merge a batch of remote ops into live state. The record MIRROR updates
  // FIRST (synchronously): the persist-effect diffs against it, so a
  // pre-updated mirror means the applied batch never echoes back up.
  const applyRemoteOps = useCallback(
    (ops: SyncOp[]) => {
      if (ops.length === 0) return
      syncedRecords = mergeMirror(syncedRecords, ops)
      const puts = ops
        .filter((o) => o.kind === 'put')
        .map((o) => ({ table: o.table, id: o.id, value: o.value }))
      const delConvs = new Set(
        ops.filter((o) => o.kind === 'del' && o.table === 'conversation').map((o) => o.id),
      )
      const delThreads = new Set(
        ops.filter((o) => o.kind === 'del' && o.table === 'thread').map((o) => o.id),
      )
      const delProjects = new Set(
        ops.filter((o) => o.kind === 'del' && o.table === 'project').map((o) => o.id),
      )
      const slice = fromRecords(puts)
      set((x) => {
        const threads = { ...x.threads, ...(slice.threads ?? {}) }
        for (const id of delConvs) delete threads[id]
        for (const id of delThreads) delete threads[id]
        return {
          ...('theme' in slice ? { theme: slice.theme } : {}),
          userName: slice.userName ?? x.userName,
          userEmail: slice.userEmail ?? x.userEmail,
          accountId: slice.accountId ?? x.accountId,
          assistantName: slice.assistantName ?? x.assistantName,
          activeSlot: slice.activeSlot ?? x.activeSlot,
          slots: slice.slots ?? x.slots,
          profiles: slice.profiles ?? x.profiles,
          autoRotate: slice.autoRotate ?? x.autoRotate,
          stickyProfile: slice.stickyProfile ?? x.stickyProfile,
          styles: slice.styles ?? x.styles,
          systemPrompt: slice.systemPrompt ?? x.systemPrompt,
          tools: slice.tools ?? x.tools,
          presetDefault: slice.presetDefault ?? x.presetDefault,
          projects: (slice.projects ?? x.projects).filter((p) => !delProjects.has(p.id)),
          conversations: (slice.conversations ?? x.conversations).filter(
            (k) => !delConvs.has(k.id),
          ),
          threads: sanitizeThreads(threads),
        }
      })
    },
    [set],
  )

  // catch up from the cursor (single-flight; frames during the pull
  // re-trigger via their own gap check)
  const pullDelta = useCallback(() => {
    if (syncPullInFlight) return
    syncPullInFlight = true
    void pullOps(syncCursor).then((res) => {
      syncPullInFlight = false
      if (!res) return
      applyRemoteOps(res.ops)
      syncCursor = Math.max(syncCursor, res.seq)
    })
  }, [applyRemoteOps])

  // hydrate from the per-user op-log once a session exists. Server state
  // wins for records it has; a fresh server gets the local data pushed up
  // (that IS the localStorage import path).
  const hydrateSync = useCallback(() => {
    if (!syncReady()) return () => {}
    let stop = false
    void pullOps(0).then((res) => {
      if (stop || !res) return
      if (res.ops.length > 0) {
        syncedRecords = []
        applyRemoteOps(res.ops)
        syncCursor = Math.max(syncCursor, res.seq)
      } else {
        // empty server → import everything local
        const local = toRecords(persistSliceOf(sRef.current))
        syncedRecords = []
        void pushOps(diffRecords([], local)).then((seq) => {
          if (seq !== null) {
            syncedRecords = local
            syncCursor = Math.max(syncCursor, seq)
          }
        })
      }
    })
    return () => {
      stop = true
    }
  }, [applyRemoteOps, sRef])

  useEffect(() => {
    const cancel = hydrateSync()
    return () => cancel()
  }, [hydrateSync])

  // live sync: one hibernating WebSocket to the user's DO. In-order frames
  // apply directly; anything ahead of the cursor pulls the delta; our own
  // pushes come back tagged src === SYNC_SRC and only advance the cursor.
  useEffect(() => {
    // start at MOUNT in any API-backed world: the manager itself waits for a
    // token (gating on login-derived state here once left the socket dead —
    // no dep changed after sign-in, so the effect never re-ran)
    if (!HAS_API) return
    return startLiveSync({
      onFrame: (f) => {
        if (f.type === 'hello') {
          if (f.seq > syncCursor) pullDelta()
          return
        }
        if (f.src === SYNC_SRC) {
          if (f.from === syncCursor) syncCursor = f.seq
          else if (f.seq > syncCursor) pullDelta()
          return
        }
        if (f.from === syncCursor) {
          applyRemoteOps(f.ops)
          syncCursor = f.seq
        } else if (f.seq > syncCursor) {
          pullDelta()
        }
      },
    })
    // s.accountId: login/logout flips syncReady — reconnect under the new identity
  }, [s.accountId, applyRemoteOps, pullDelta])

  return { hydrateSync }
}
