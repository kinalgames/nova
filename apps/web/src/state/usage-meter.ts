// Usage/cost accounting — a pure derivation from state, no actions, no
// hooks. Account-kind profiles cost 0; keys/endpoints meter by the active
// model's per-1M-token pricing. Feeds the context-window meter (current
// thread), the per-profile totals shown in Settings, and the current-month
// roll-up (local, or the server's cross-device one when present).

import { findModel, findModelById } from '../data/defs'
import type { Message, NovaState } from './types'

export const fmtCost = (c: number) => (c < 0.0001 ? '<$0.0001' : `$${c.toFixed(4)}`)

export interface UsageMeter {
  costOf: (u: NonNullable<Message['usage']>) => number
  usageIn: number
  usageOut: number
  usageCost: number
  /** % of the ACTIVE model's real context window used so far by the current
   *  thread — the single source both the meter bar and its "remaining"
   *  label derive from; never two independently-stated numbers */
  usedPct: number
  /** all-time totals per auth profile (every thread, every version) —
   *  shown in Settings so the user sees what each profile has consumed */
  profileTotals: Record<string, { inTok: number; outTok: number; cost: number }>
  monthIn: number
  monthOut: number
  monthCost: number
  /** the server roll-up (all devices) — beats the local one when present */
  serverMonth: { inTok: number; outTok: number; cost: number } | null
}

export function computeUsageMeter(s: NovaState, activeThread: Message[]): UsageMeter {
  const allProfiles = Object.values(s.profiles).flat()
  const costOf = (u: NonNullable<Message['usage']>): number => {
    const prof = allProfiles.find((f) => f.id === u.profileId)
    if (prof && prof.kind === 'account') return 0
    const md = findModelById(u.modelId)
    return md ? (u.inputTokens * md.inPrice + u.outputTokens * md.outPrice) / 1e6 : 0
  }

  // conversation-level roll-up for the meter
  let usageIn = 0
  let usageOut = 0
  let usageCost = 0
  for (const m of activeThread) {
    const u = m.usage
    if (!u) continue
    usageIn += u.inputTokens
    usageOut += u.outputTokens
    usageCost += costOf(u)
  }
  const usedPct = Math.min(
    98,
    Math.round(((usageIn + usageOut) / (findModel(s.slots[s.activeSlot]).ctx || 200_000)) * 100),
  )

  const profileTotals: Record<string, { inTok: number; outTok: number; cost: number }> = {}
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  let monthIn = 0
  let monthOut = 0
  let monthCost = 0
  for (const th of Object.values(s.threads))
    for (const m of Object.values(th.byId)) {
      const u = m.usage
      if (!u) continue
      if ((u.at ?? 0) >= monthStart) {
        monthIn += u.inputTokens
        monthOut += u.outputTokens
        monthCost += costOf(u)
      }
      if (!u.profileId) continue
      const agg = (profileTotals[u.profileId] ??= { inTok: 0, outTok: 0, cost: 0 })
      agg.inTok += u.inputTokens
      agg.outTok += u.outputTokens
      agg.cost += costOf(u)
    }

  const serverMonth = (() => {
    if (!s.serverUsage || s.serverUsage.length === 0) return null
    let inTok = 0
    let outTok = 0
    let cost = 0
    for (const r of s.serverUsage) {
      inTok += r.inTok
      outTok += r.outTok
      if (r.kind !== 'account') {
        const md = findModelById(r.modelId)
        if (md) cost += (r.inTok * md.inPrice + r.outTok * md.outPrice) / 1e6
      }
    }
    return { inTok, outTok, cost }
  })()

  return { costOf, usageIn, usageOut, usageCost, usedPct, profileTotals, monthIn, monthOut, monthCost, serverMonth }
}
