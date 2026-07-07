// BE3 — provider credential CRUD (add/remove/reorder/test a profile). Plain
// functions, not a hook — deriveValues (a plain function itself) calls this
// factory once per render and gets back stable-enough closures over the
// CURRENT s/set/t, matching exactly how these lived inline before.

import type { TFunction } from 'i18next'
import { findProvider, type ProfileKind, type ProviderId } from '../data/defs'
import { HAS_API } from '../services/llm'
import { getToken } from '../services/auth'
import { addCredential, deleteCredential, patchCredential, pingCredential } from '../services/credentials'
import { humanErrorDetail } from '../services/errors'
import type { AuthProfile, NovaState } from './types'
import { uid, type Updater } from './store-helpers'

export function createCredentialActions(s: NovaState, set: (u: Updater) => void, t: TFunction) {
  const addProfile = (providerId: ProviderId, kind: ProfileKind, name: string, credential: string) => {
    const fallbackName = kind === 'account' ? t('settings.kindAccount') : t('settings.kindApiKey')
    // real mode with a session seals the credential server-side — the browser
    // keeps only the returned hint
    if (HAS_API && getToken()) {
      void addCredential(providerId, kind, name.trim() || fallbackName, credential.trim()).then(
        (row) => {
          if (!row) return
          set((x) => ({
            profiles: {
              ...x.profiles,
              [providerId]: [
                ...(x.profiles[providerId] ?? []),
                {
                  id: row.id,
                  name: row.name,
                  kind: row.kind,
                  credential: row.hint,
                  status: row.status,
                  server: true,
                } satisfies AuthProfile,
              ],
            },
          }))
        },
      )
      return
    }
    const prof: AuthProfile = {
      id: uid(),
      name: name.trim() || fallbackName,
      kind,
      credential: credential.trim(),
      status: 'untested',
    }
    set((x) => ({
      profiles: { ...x.profiles, [providerId]: [...(x.profiles[providerId] ?? []), prof] },
    }))
  }

  const removeProfile = (providerId: ProviderId, profileId: string) => {
    const row = s.profiles[providerId]?.find((f) => f.id === profileId)
    if (row?.server) void deleteCredential(profileId) // optimistic — list re-syncs on next boot
    return set((x) => {
      const sticky = { ...x.stickyProfile }
      if (sticky[providerId] === profileId) delete sticky[providerId]
      return {
        profiles: {
          ...x.profiles,
          [providerId]: (x.profiles[providerId] ?? []).filter((f) => f.id !== profileId),
        },
        stickyProfile: sticky,
      }
    })
  }

  const moveProfile = (providerId: ProviderId, profileId: string, delta: -1 | 1) =>
    set((x) => {
      const list = [...(x.profiles[providerId] ?? [])]
      const i = list.findIndex((f) => f.id === profileId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= list.length) return {}
      ;[list[i], list[j]] = [list[j], list[i]]
      // server-backed rows persist the new rotation order (priority = index)
      list.forEach((f, idx) => {
        if (f.server) void patchCredential(f.id, { priority: idx })
      })
      return { profiles: { ...x.profiles, [providerId]: list } }
    })

  const testProfile = (providerId: ProviderId, profileId: string) => {
    // a server-backed credential gets a REAL probe: a 1-token chat through
    // the stored id against the provider's cheapest model
    const row = s.profiles[providerId]?.find((f) => f.id === profileId)
    if (row?.server && HAS_API) {
      set({ testingProfile: profileId })
      const model = findProvider(providerId).models.at(-1)?.id ?? ''
      void pingCredential(profileId, providerId, model).then(({ status, detail, code, httpStatus }) => {
        void patchCredential(profileId, { status })
        set((x) => ({
          testingProfile: null,
          // the failure REASON stays visible under the row, in plain words
          // (technical tail kept small) — “Thất bại” without a why is a dead end
          testDetail:
            status === 'active' || !detail
              ? null
              : { id: profileId, msg: humanErrorDetail(code ?? 'error', detail, httpStatus) },
          profiles: {
            ...x.profiles,
            [providerId]: (x.profiles[providerId] ?? []).map((f) =>
              f.id === profileId ? { ...f, status, limitedUntil: undefined } : f,
            ),
          },
        }))
      })
      return
    }
    set({ testingProfile: profileId })
    setTimeout(() => {
      set((x) => ({
        testingProfile: null,
        profiles: {
          ...x.profiles,
          [providerId]: (x.profiles[providerId] ?? []).map((f) =>
            f.id === profileId
              ? {
                  ...f,
                  // fake check: accounts always connect; keys need plausible length
                  status:
                    f.kind === 'account' || f.credential.trim().length > 4
                      ? ('active' as const)
                      : ('error' as const),
                  limitedUntil: undefined,
                }
              : f,
          ),
        },
      }))
    }, 900)
  }

  return { addProfile, removeProfile, moveProfile, testProfile }
}
