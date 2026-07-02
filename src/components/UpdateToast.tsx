import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'

/** paper-style toast shown when a newer deploy is live — reload to pick it up */
export function UpdateToast() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.updateReady) return null
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-panel py-2.5 pl-4 pr-2.5 shadow-overlay animate-[fadeUp_180ms_var(--ease-paper)]"
    >
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent text-bg">
        <Icon n="nova" size={13} />
      </span>
      <span className="text-ui text-text">{t('update.ready')}</span>
      <button
        type="button"
        onClick={v.reloadNow}
        className="cursor-pointer whitespace-nowrap rounded-sm border-none bg-ink px-3 py-1.5 text-small text-bg"
      >
        {t('update.reload')}
      </button>
      <button
        type="button"
        aria-label={t('update.dismiss')}
        onClick={v.dismissUpdate}
        className="flex cursor-pointer items-center border-none bg-transparent p-1 text-faint hover:text-text-2"
      >
        <Icon n="close" size={14} />
      </button>
    </div>
  )
}
