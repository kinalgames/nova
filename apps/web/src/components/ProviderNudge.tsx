import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { BTN_PRIMARY } from './ui'

/** BYOK empty-state: chat never shows a dead end. When the active model has
 *  no connected provider, explain the ONE next step and link straight to it —
 *  sign in first, or open Settings → Providers when already signed in. */
export function ProviderNudge({ compact = false }: { compact?: boolean }) {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.needsProvider) return null
  if (compact)
    return (
      // key remounts on every blocked send — the flash animation replays,
      // pulling the eye to the one actionable step
      <div
        key={v.nudgeNonce}
        className="mx-auto mb-2 flex w-full max-w-[680px] flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-panel px-4 py-2.5 animate-[nudgeFlash_900ms_var(--ease-paper)]">
        <Icon n="plus" size={14} className="shrink-0 text-accent-text" />
        <span className="min-w-0 flex-1 basis-[12rem] text-small leading-normal text-text-2">
          {t('chat.nudgeBody')}
        </span>
        <button type="button" onClick={v.nudgeGo} className={`${BTN_PRIMARY} shrink-0`}>
          {v.nudgeLogin ? t('chat.nudgeCtaLogin') : t('chat.nudgeCta')}
        </button>
      </div>
    )
  return (
    <div key={v.nudgeNonce} className="flex min-h-[58vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-panel text-accent-text animate-[nudgeFlash_900ms_var(--ease-paper)]">
        <Icon n="plus" size={20} />
      </div>
      <div className="font-display text-h3">{t('chat.nudgeTitle')}</div>
      <div className="mt-2 max-w-[420px] text-body leading-normal text-muted">{t('chat.nudgeBody')}</div>
      <button type="button" onClick={v.nudgeGo} className={`${BTN_PRIMARY} mt-5`}>
        {v.nudgeLogin ? t('chat.nudgeCtaLogin') : t('chat.nudgeCta')}
      </button>
    </div>
  )
}
