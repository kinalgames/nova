import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { adoptSocialSession } from '../services/auth'

export const Route = createFileRoute('/oauth-done')({ component: OAuthDone })

/**
 * OAuth POPUP landing: exchange the cookie session for the bearer token —
 * localStorage is same-origin, so the opener window sees it immediately —
 * then close. A direct or blocked-popup-fallback visit (no opener) simply
 * continues into the app the classic way.
 */
function OAuthDone() {
  const { t } = useTranslation()
  useEffect(() => {
    void adoptSocialSession().then(() => {
      if (window.opener) {
        window.close()
        return
      }
      // direct or blocked-popup-fallback visit — continue the classic way
      window.location.replace('/')
    })
  }, [])
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg text-body text-muted">
      {t('auth.oauthFinishing')}
    </div>
  )
}
