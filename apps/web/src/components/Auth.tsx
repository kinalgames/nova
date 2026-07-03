import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'

const INPUT = 'field w-full rounded-md border border-border bg-panel px-3 py-3 text-body'

/** onboarding — every choice here persists into the store for real */
function Onboarding() {
  const { v } = useStore()
  const { t } = useTranslation()
  const [name, setName] = useState(v.assistantName)
  const [styles, setStyles] = useState(v.stylesState)
  const [slot, setSlot] = useState<'smart' | 'fast'>('smart')
  const styleChip = (key: 'concise' | 'warm' | 'formal') => (
    <button
      type="button"
      aria-pressed={styles[key]}
      onClick={() => setStyles((s) => ({ ...s, [key]: !s[key] }))}
      className={`cursor-pointer rounded-sm border px-3 py-1.5 text-ui ${
        styles[key]
          ? 'border-accent bg-accent-soft text-accent-text'
          : 'border-border bg-transparent text-muted'
      }`}
    >
      {t(`vocab.styles.${key}`)}
    </button>
  )
  const slotCard = (id: 'smart' | 'fast', label: string, sub: string) => (
    <button
      type="button"
      aria-pressed={slot === id}
      onClick={() => setSlot(id)}
      className={`flex-1 cursor-pointer rounded-md border px-3 py-3 text-left ${
        slot === id ? 'border-accent bg-accent-soft' : 'border-border bg-transparent'
      }`}
    >
      <div className="text-ui">{label}</div>
      <div className="text-meta text-muted">{sub}</div>
    </button>
  )
  return (
    <>
      <div className="text-center font-display text-h2 leading-tight">{t('authForm.welcome')}</div>
      <div className="mb-6 mt-2 text-center text-body text-muted">{t('authForm.welcomeSub')}</div>
      <div className="mb-2 font-mono text-micro tracking-[.14em] text-faint">{t('authForm.assistantName')}</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={t('authForm.assistantName')}
        className="field mb-5 w-full rounded-md border border-border bg-panel px-3 py-3 text-body"
      />
      <div className="mb-2.5 font-mono text-micro tracking-[.14em] text-faint">{t('authForm.styleLabel')}</div>
      <div className="mb-5 flex flex-wrap gap-2">
        {styleChip('concise')}
        {styleChip('warm')}
        {styleChip('formal')}
      </div>
      <div className="mb-2.5 font-mono text-micro tracking-[.14em] text-faint">{t('authForm.defaultModel')}</div>
      <div className="mb-6 flex gap-2">
        {slotCard('smart', t('model.smart'), t('model.smartDesc'))}
        {slotCard('fast', t('model.fast'), t('model.fastDesc'))}
      </div>
      <button
        type="button"
        onClick={() => v.completeOnboarding({ assistantName: name, styles, slot })}
        className="cursor-pointer rounded-md border-none bg-ink p-3 text-center text-body font-medium text-bg"
      >
        {t('authForm.start')}
      </button>
    </>
  )
}

function EmailForm({
  cta,
  onSubmit,
}: {
  cta: string
  /** resolves to an error message, or null on success */
  onSubmit: (email: string, password: string) => Promise<string | null>
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t('authForm.emailInvalid'))
    if (pw.length < 6) return setError(t('authForm.pwShort'))
    setError(null)
    setBusy(true)
    void onSubmit(email, pw)
      .then((err) => setError(err))
      .finally(() => setBusy(false))
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setError(null)
        }}
        placeholder={t('authForm.email')}
        aria-label={t('authForm.email')}
        autoComplete="email"
        className={INPUT}
      />
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        type="password"
        placeholder={t('authForm.password')}
        aria-label={t('authForm.password')}
        autoComplete="current-password"
        className={INPUT}
      />
      {error && (
        <div role="alert" className="text-small text-danger-text">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="cursor-pointer rounded-md border-none bg-ink p-3 text-center text-body font-medium text-bg disabled:cursor-default disabled:opacity-[.38]"
      >
        {cta}
      </button>
    </form>
  )
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.42-5.27 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

function SocialButtons() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'google' | 'github' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { v } = useStore()
  const start = (provider: 'google' | 'github') => {
    setBusy(provider)
    setError(null)
    // popup UX — this window keeps its state; the store adopts the session
    void v
      .socialLogin(provider)
      .then((err) => setError(err))
      .finally(() => setBusy(null))
  }
  const btn =
    'flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-border bg-panel p-3 text-left text-body hover:bg-fill disabled:cursor-default disabled:opacity-[.38]'
  return (
    <div className="mb-4 flex flex-col gap-2">
      <button type="button" disabled={busy !== null} onClick={() => start('google')} className={btn}>
        <GoogleMark />
        {t('authForm.google')}
      </button>
      <button type="button" disabled={busy !== null} onClick={() => start('github')} className={btn}>
        <GithubMark />
        {t('authForm.github')}
      </button>
      {error && (
        <div role="alert" className="text-small text-danger-text">
          {error}
        </div>
      )}
    </div>
  )
}

export function Auth() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.showAuth) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-bg p-6 animate-[dim_.2s_ease]">
      <div className="w-[380px] max-w-full">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="size-[15px] rounded-full bg-ink shadow-[inset_-4px_-4px_0_var(--bg)]" />
          <span className="font-display text-h2">Nova</span>
        </div>

        {v.isLoginForm && (
          <>
            <div className="text-center font-display text-h1 leading-tight">{v.authTitle}</div>
            <div className="mb-6 mt-2 text-center text-body text-muted">{v.authSub}</div>
            <SocialButtons />
            <div className="mb-4 flex items-center gap-3 text-meta text-faint">
              <div className="h-px flex-1 bg-border" />
              {t('authForm.or')}
              <div className="h-px flex-1 bg-border" />
            </div>
            <EmailForm cta={v.authCta} onSubmit={v.submitAuth} />
            <div className="mt-5 text-center text-ui text-muted">
              {v.authToggleText}{' '}
              <button
                type="button"
                onClick={v.authToggleAct}
                className="cursor-pointer border-none bg-transparent text-left text-accent-text"
              >
                {v.authToggleLink}
              </button>
            </div>
            <div className="mt-3 text-center">
              <Link
                to="/demo"
                className="text-ui text-faint underline underline-offset-2 hover:text-muted"
              >
                {t('authForm.tryDemo')}
              </Link>
            </div>
          </>
        )}

        {v.isOnboarding && <Onboarding />}
      </div>
    </div>
  )
}
