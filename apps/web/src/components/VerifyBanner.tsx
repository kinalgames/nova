import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'

/** D5 — a slim, dismissible-by-verifying strip nudging the signed-in user to
 *  confirm their email. Soft by design: it never blocks the app, it only
 *  offers to resend the verification link. */
export function VerifyBanner() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.needsVerify) return null
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-warn-bg px-4 py-2">
      <Icon n="info" size={14} className="shrink-0 text-warn-text" />
      <span className="min-w-0 flex-1 basis-[12rem] text-small text-warn-text">
        {t('chat.verifyBody')}
      </span>
      <button
        type="button"
        onClick={() => void v.resendVerify()}
        className="shrink-0 cursor-pointer whitespace-nowrap rounded-sm border-none bg-transparent px-1.5 py-0.5 text-small font-medium text-warn-text underline underline-offset-2 outline-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t('chat.verifyCta')}
      </button>
    </div>
  )
}
