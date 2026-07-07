// BE3/T8 — everything that happens once a session exists: pull server-side
// credentials (migrating any client-held real profiles up once), resolve
// the account user, and pull the month usage roll-up. Bundled into one hook
// because they boot together (one queueMicrotask on mount) and login/signup
// re-triggers credentials+usage together via ONE returned callback — this
// mirrors exactly what the pre-extraction code did with a module-level
// `triggerCredHydrate` function-pointer, except the pointer is gone: the
// hook returns `hydrateAfterLogin` and callers invoke it directly.

import { useCallback, useEffect, type RefObject } from 'react'
import {
  fetchMe,
  getToken,
  type SessionUser,
} from '../services/auth'
import { HAS_API } from '../services/llm'
import { addCredential, listCredentials, type ServerCredential } from '../services/credentials'
import { fetchMonthUsage } from '../services/usage'
import { loadPersisted, PERSIST_KEY } from './persist'
import type { AuthProfile, NovaState } from './types'
import type { ProviderId } from '../data/defs'
import { initialState, type Updater } from './store-helpers'
import { __resetSync } from './sync-engine'

/** wipe local device state for a NEW account landing on a device that still
 *  has another account's data — never mix two users' local data */
function adoptAccountInto(set: (u: Updater) => void, prevAccountId: string | undefined, me: SessionUser) {
  if (prevAccountId && prevAccountId !== me.id) {
    try {
      localStorage.removeItem(PERSIST_KEY)
    } catch {
      /* ignore */
    }
    __resetSync()
    set(() => ({
      ...initialState(),
      accountId: me.id,
      userName: me.name,
      userEmail: me.email,
      ...(me.assistantName ? { assistantName: me.assistantName } : {}),
      hasPassword: me.hasPassword ?? false,
      emailVerified: me.emailVerified ?? false,
    }))
  } else {
    set({
      accountId: me.id,
      userName: me.name,
      userEmail: me.email,
      ...(me.assistantName ? { assistantName: me.assistantName } : {}),
      hasPassword: me.hasPassword ?? false,
      emailVerified: me.emailVerified ?? false,
    })
  }
}

export function useAccountHydration(sRef: RefObject<NovaState>, set: (u: Updater) => void) {
  // real mode reads provider credentials from the server (sealed BYOK). The
  // first hydration MIGRATES any client-held real profiles up once — the
  // secret leaves the browser one last time, then only hints remain.
  const hydrateCredentials = useCallback(async () => {
    if (!HAS_API || !getToken()) return
    let rows = await listCredentials()
    if (!rows) return
    if (rows.length === 0) {
      const local = sRef.current.profiles
      let migrated = false
      for (const pid of Object.keys(local) as ProviderId[]) {
        for (const f of local[pid] ?? []) {
          if (!f.server && f.credential.trim()) {
            await addCredential(pid, f.kind, f.name, f.credential)
            migrated = true
          }
        }
      }
      if (migrated) rows = (await listCredentials()) ?? []
    }
    const fromServer = (r: ServerCredential): AuthProfile => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      credential: r.hint,
      status: r.status,
      server: true,
    })
    const profiles: NovaState['profiles'] = { claude: [], gemini: [], openai: [], ollama: [] }
    for (const r of rows) profiles[r.providerId]?.push(fromServer(r))
    set({ profiles })
  }, [sRef, set])

  // Social OAuth lands with a fresh token but NOTHING persisted about the
  // account — boot resolves the session user once and adopts it (and heals
  // stale info for every login kind). Mirrors adoptAccount's account guard.
  const hydrateUser = useCallback(async () => {
    if (!HAS_API || !getToken()) return
    const me = await fetchMe()
    if (!me) return
    adoptAccountInto(set, sRef.current.accountId, me)
  }, [sRef, set])

  /** adopt a signed-in profile into local state — resets the device when a
   *  DIFFERENT account was here before (never mix two users' local data) */
  const adoptAccount = useCallback(
    (me: SessionUser) => adoptAccountInto(set, loadPersisted().accountId, me),
    [set],
  )

  // the server-side month usage roll-up — the Settings meter then reflects
  // EVERY device, not just this one's threads
  const hydrateUsage = useCallback(async () => {
    if (!HAS_API || !getToken()) return
    const rows = await fetchMonthUsage()
    if (rows) set({ serverUsage: rows })
  }, [set])

  const hydrateAfterLogin = useCallback(() => {
    void hydrateCredentials()
    void hydrateUsage()
  }, [hydrateCredentials, hydrateUsage])

  useEffect(() => {
    // microtask: runs right after this commit (deterministic, unlike a
    // setTimeout macrotask) so the async hydrate never sets state mid-render
    queueMicrotask(() => {
      void hydrateUser()
      void hydrateCredentials()
      void hydrateUsage()
    })
  }, [hydrateCredentials, hydrateUsage, hydrateUser])

  return { hydrateCredentials, hydrateUser, adoptAccount, hydrateUsage, hydrateAfterLogin }
}
