// D1 follow-up — Gemini's account-kind body: open Google's consent screen in
// a popup, then paste the failed-redirect address back. The server trades it
// for a refresh token and hands it to the SAME addProfile('gemini','account',…)
// path a manual paste already used — see apps/api/src/credentials.ts for why
// the redirect target is a loopback nobody listens on.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import type { ProviderVM } from './SettingsDialog'

export function GeminiOAuthPanel({ pr }: { pr: ProviderVM }) {
  const { v } = useStore()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [pasted, setPasted] = useState('')
  const oauth = v.geminiOAuth
  const submit = () => {
    if (!pasted.trim()) return
    v.submitGeminiCode(pasted, name)
  }
  return (
    <div>
      <div className="mb-2.5 text-small leading-normal text-muted">{t('settings.accountHelpGemini')}</div>
      <button
        type="button"
        onClick={v.startGeminiLogin}
        disabled={oauth.status === 'opening'}
        className="tap-sm mb-2.5 flex cursor-pointer items-center gap-1.5 rounded-sm border border-accent-line bg-transparent px-2.5 py-1.5 text-small text-accent-text disabled:cursor-default disabled:opacity-60"
      >
        <Icon n="open" size={13} />
        {oauth.status === 'opening' ? t('settings.oauthOpening') : t('settings.oauthOpenGoogle')}
      </button>
      <div className="mb-2.5 text-small leading-normal text-muted">{t('settings.oauthPasteHelp')}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.profileName')}
          aria-label={`${t('settings.profileName')} — ${pr.name}`}
          className="field w-32 max-sm:w-full rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
        />
        <input
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={t('settings.oauthPastePlaceholder')}
          aria-label={`${t('settings.oauthPasteLabel')} — ${pr.name}`}
          spellCheck={false}
          className="field min-w-0 flex-1 basis-[14rem] rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!pasted.trim() || oauth.status === 'exchanging'}
          aria-label={`${t('settings.addProfile')} — ${pr.name}`}
          className="tap-sm cursor-pointer whitespace-nowrap rounded-sm border border-accent-line bg-transparent px-2.5 py-1.5 font-mono text-eyebrow text-accent-text disabled:cursor-default disabled:opacity-[.38]"
        >
          {oauth.status === 'exchanging' ? t('settings.oauthExchanging') : t('settings.addAction')}
        </button>
      </div>
      {oauth.error && (
        <div className="mt-2 rounded-sm border border-danger-line bg-danger-bg px-2 py-1 text-small leading-normal text-danger-text">
          {oauth.error}
        </div>
      )}
    </div>
  )
}
