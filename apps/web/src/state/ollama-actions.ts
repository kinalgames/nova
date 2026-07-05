// B6c — the ollama catalog + model-pull actions, split out of the
// StoreProvider component so this domain reads and tests on its own. A
// custom hook (not a plain function) because it owns useCallback/useEffect —
// callers must invoke it unconditionally, at the same relative position on
// every render, exactly like any other hook.

import { useCallback, useEffect, type RefObject } from 'react'
import i18n from '../i18n'
import { HAS_API } from '../services/llm'
import { getToken } from '../services/auth'
import { listOllamaModels, pullOllamaModel } from '../services/ollama'
import type { NovaState } from './types'
import { showToast, type Updater } from './store-helpers'

export function useOllamaActions(
  ollamaProfiles: NovaState['profiles']['ollama'],
  sRef: RefObject<NovaState>,
  set: (u: Updater) => void,
) {
  const hydrateOllama = useCallback(async () => {
    const prof = (sRef.current.profiles.ollama ?? [])[0]
    if (!prof || !HAS_API || !getToken()) return
    const rows = await listOllamaModels(prof)
    if (rows) set({ ollamaModels: rows })
  }, [sRef, set])

  useEffect(() => {
    if ((ollamaProfiles ?? []).length === 0) return
    void hydrateOllama()
  }, [ollamaProfiles, hydrateOllama])

  const pullOllama = useCallback(
    (model: string) => {
      const prof = (sRef.current.profiles.ollama ?? [])[0]
      const name = model.trim()
      if (!prof || !name || sRef.current.ollamaPull) return
      set({ ollamaPull: { model: name, pct: null, status: '' } })
      void pullOllamaModel(prof, name, {
        onProgress: (pct, status) => set({ ollamaPull: { model: name, pct, status } }),
        onDone: () => {
          set({ ollamaPull: null })
          showToast(set, i18n.t('settings.ollamaPullDone', { model: name }))
          void hydrateOllama()
        },
        onError: (detail) => {
          set({ ollamaPull: null })
          showToast(set, i18n.t('settings.ollamaPullFailed', { detail }))
        },
      })
    },
    [sRef, set, hydrateOllama],
  )

  return { hydrateOllama, pullOllama }
}
