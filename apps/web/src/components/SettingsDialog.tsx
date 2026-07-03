import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { setLanguage, type Language } from '../i18n'
import { Icon } from './Icon'
import { ToggleRow } from './ToggleRow'
import { PresetCard } from './PresetCard'
import { ProviderLogo } from './ProviderLogo'

const TABS = [
  { id: 'general', labelKey: 'settings.tabGeneral', icon: 'settings' },
  { id: 'providers', labelKey: 'settings.tabProviders', icon: 'command' },
  { id: 'assistant', labelKey: 'settings.tabAssistant', icon: 'nova' },
] as const

const LABEL = 'font-mono text-eyebrow tracking-[0.14em] text-faint'

export function SettingsDialog() {
  const { v } = useStore()
  const { t } = useTranslation()
  const mobile = v.isMobile
  return (
    <Dialog.Root open={v.settingsOpen} onOpenChange={(o) => !o && v.closeSettings()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] animate-[dim_140ms_ease] bg-scrim-strong" />
        <Dialog.Content
          aria-describedby={undefined}
          className={
            mobile
              ? 'fixed inset-0 z-[56] flex flex-col bg-bg pb-[env(safe-area-inset-bottom)] outline-none animate-[slideR_180ms_ease]'
              : 'fixed left-1/2 top-1/2 z-[56] flex h-[640px] max-h-[88vh] w-[860px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-bg shadow-overlay outline-none animate-[pop_160ms_var(--ease-paper)]'
          }
          style={mobile ? undefined : { flexDirection: 'row' }}
        >
          <Dialog.Title className="sr-only">{t('settings.title')}</Dialog.Title>

          {/* rail / tabs */}
          <div
            role="tablist"
            aria-label={t('settings.tabsAria')}
            className={
              mobile
                ? 'flex flex-shrink-0 items-center gap-1 border-b border-border px-3 py-2'
                : 'flex w-[184px] flex-shrink-0 flex-col gap-0.5 border-r border-border bg-side p-3'
            }
          >
            {!mobile && <div className={`${LABEL} px-2 pb-2 pt-1`}>{t('settings.railLabel')}</div>}
            {TABS.map((tab) => {
              const active = v.settingsTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => v.setSettingsTab(tab.id)}
                  className={
                    'flex items-center gap-2.5 cursor-pointer rounded-lg border-none text-left text-ui outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                    (mobile ? 'px-3 py-1.5 ' : 'px-3 py-2 ') +
                    (active
                      ? 'bg-accent-soft text-accent-text ' + (mobile ? '' : 'shadow-[inset_2px_0_0_var(--accent)]')
                      : 'bg-transparent text-text-2 hover:bg-hover-1')
                  }
                >
                  <Icon n={tab.icon} size={16} className={'flex-shrink-0 ' + (active ? 'text-accent' : 'opacity-50')} />
                  {t(tab.labelKey)}
                </button>
              )
            })}
          </div>

          {/* panel */}
          <div role="tabpanel" className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between px-6 pb-2 pt-5">
              <div className="font-display text-h3">
                {t(TABS.find((tab) => tab.id === v.settingsTab)?.labelKey ?? 'settings.tabGeneral')}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  className="flex cursor-pointer rounded-md border-none bg-transparent p-1 text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Icon n="close" size={18} />
                </button>
              </Dialog.Close>
            </div>
            <div className="px-6 pb-8 pt-2">
              {v.settingsTab === 'general' && <General />}
              {v.settingsTab === 'providers' && <Providers />}
              {v.settingsTab === 'assistant' && <Assistant />}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function General() {
  const { v } = useStore()
  const { t, i18n } = useTranslation()
  const [confirmClear, setConfirmClear] = useState(false)
  const langBtn = (lng: Language, label: string) => (
    <button
      type="button"
      aria-pressed={i18n.language === lng}
      onClick={() => setLanguage(lng)}
      className="cursor-pointer rounded-sm border px-3 py-1 text-small"
      style={{
        borderColor: i18n.language === lng ? v.accent : 'var(--border)',
        background: i18n.language === lng ? 'var(--accent-soft)' : 'transparent',
        color: i18n.language === lng ? 'var(--accent-text)' : 'var(--muted)',
      }}
    >
      {label}
    </button>
  )
  return (
    <>
      {/* advanced mode */}
      <div
        className="mb-6 rounded-md border p-4"
        style={{ borderColor: v.advBorder, background: v.advBg }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-ink text-bg">
            <Icon n="command" size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-body font-medium">{t('settings.advanced')}</div>
            <div className="mt-0.5 text-small leading-normal text-muted">{t('settings.advancedSub')}</div>
          </div>
          <Switch.Root
            checked={v.advanced}
            onCheckedChange={v.toggleAdvanced}
            aria-label={t('settings.advanced')}
            className="relative h-[25px] w-11 shrink-0 cursor-pointer rounded-md bg-border p-0.5 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=checked]:bg-accent"
          >
            <Switch.Thumb className="block size-[21px] rounded-full bg-[var(--knob)] shadow-[var(--knob-shadow)] transition-transform data-[state=checked]:translate-x-[19px]" />
          </Switch.Root>
        </div>
      </div>

      <div className={`${LABEL} mb-3`}>{t('settings.appearance')}</div>
      <div role="group" aria-label={t('settings.appearance')} className="flex flex-wrap gap-1.5 border-b border-border px-0.5 pb-4 pt-0.5">
        <button type="button" aria-pressed={v.themeVal === 'light'} onClick={v.setLight} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeLightBd, background: v.themeLightBg, color: v.themeLightFg }}>{t('settings.themeLight')}</button>
        <button type="button" aria-pressed={v.themeVal === 'dark'} onClick={v.setDark} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeDarkBd, background: v.themeDarkBg, color: v.themeDarkFg }}>{t('settings.themeDark')}</button>
        <button type="button" aria-pressed={v.themeVal === 'auto'} onClick={v.setAuto} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeAutoBd, background: v.themeAutoBg, color: v.themeAutoFg }}>{t('settings.themeAuto')}</button>
      </div>

      <div className={`${LABEL} mb-3 mt-4`}>{t('settings.language')}</div>
      <div role="group" aria-label={t('settings.language')} className="flex flex-wrap gap-1.5 border-b border-border px-0.5 pb-4 pt-0.5">
        {langBtn('vi', 'Tiếng Việt')}
        {langBtn('en', 'English')}
      </div>

      <ToggleRow
        title={t('settings.shortcutsTitle')}
        sub={t('settings.shortcutsSub')}
        on={v.barOn}
        onToggle={v.toggleBar}
      />

      <div className={`${LABEL} mb-1.5 mt-6`}>{t('settings.focusSection')}</div>
      <div className="flex items-center justify-between gap-3 border-b border-border px-0.5 py-3">
        <span className="text-body">{t('settings.sessionLength')}</span>
        <div role="group" aria-label={t('settings.sessionLength')} className="flex shrink-0 gap-1.5">
          <button type="button" aria-pressed={v.focusVal === '15'} onClick={v.setF15} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f15Bd, background: v.f15Bg, color: v.f15Fg }}>15′</button>
          <button type="button" aria-pressed={v.focusVal === '25'} onClick={v.setF25} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f25Bd, background: v.f25Bg, color: v.f25Fg }}>25′</button>
          <button type="button" aria-pressed={v.focusVal === '50'} onClick={v.setF50} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f50Bd, background: v.f50Bg, color: v.f50Fg }}>50′</button>
        </div>
      </div>

      <div className={`${LABEL} mb-1.5 mt-6`}>{t('settings.profileSection')}</div>
      <div className="flex flex-col gap-3 border-b border-border px-0.5 py-3">
        <div>
          <label className="mb-1.5 block font-mono text-micro tracking-[.12em] text-faint" htmlFor="pf-username">
            {t('settings.yourName')}
          </label>
          <input
            id="pf-username"
            value={v.userName}
            onChange={(e) => v.setUserName(e.target.value)}
            className="field w-full rounded-sm border border-border bg-panel px-3 py-2 text-body"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-micro tracking-[.12em] text-faint" htmlFor="pf-assistant">
            {t('settings.assistantName')}
          </label>
          <input
            id="pf-assistant"
            value={v.assistantName}
            onChange={(e) => v.setAssistantName(e.target.value)}
            className="field w-full rounded-sm border border-border bg-panel px-3 py-2 text-body"
          />
        </div>
      </div>

      <div className={`${LABEL} mb-1.5 mt-6`}>{t('settings.dataSection')}</div>
      <div className="flex flex-col gap-2 border-b border-border px-0.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-body">{t('settings.exportAll')}</div>
            <div className="text-small text-muted">{t('settings.exportAllHelp')}</div>
          </div>
          <button
            type="button"
            onClick={v.exportAllData}
            className="shrink-0 cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-text-2"
          >
            {t('settings.exportAllAction')}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-body">{t('settings.clearAll')}</div>
            <div className="text-small text-muted">{t('settings.clearAllHelp')}</div>
          </div>
          {confirmClear ? (
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={v.clearAllData}
                className="cursor-pointer rounded-sm border-none bg-danger-strong px-3 py-1.5 text-small text-on-ink"
              >
                {t('settings.clearAllConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-muted"
              >
                {t('common.cancel')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="shrink-0 cursor-pointer rounded-sm border border-danger-line bg-transparent px-3 py-1.5 text-small text-danger"
            >
              {t('settings.clearAllAction')}
            </button>
          )}
        </div>
      </div>

      <div className={`${LABEL} mb-1.5 mt-6`}>{t('settings.account')}</div>
      <div className="flex items-center gap-3 px-0.5 py-3">
        <div className="size-[38px] shrink-0 rounded-full bg-[linear-gradient(135deg,#E0A06B,var(--accent))]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body">{v.userName}</div>
          <div className="truncate text-small text-muted">{v.userEmail} · {t('user.plan')}</div>
        </div>
        <button type="button" onClick={v.logout} className="cursor-pointer border-none bg-transparent text-small text-faint">{t('nav.logout')}</button>
      </div>
      <PasswordSection />
      <DangerZone />
    </>
  )
}

type ProviderVM = ReturnType<typeof useStore>['v']['providers'][number]

/** inline add-profile form — kind picker (「Tài khoản」/「Khóa API」) + label + credential */
function AddProfileForm({ pr }: { pr: ProviderVM }) {
  const { t } = useTranslation()
  const [kind, setKind] = useState(pr.kinds[0].kind)
  const [name, setName] = useState('')
  const [cred, setCred] = useState('')
  const submit = () => {
    if (!cred.trim()) return
    pr.addProfile(kind, name, cred)
    setName('')
    setCred('')
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {pr.kinds.length > 1 && (
        <div className="flex overflow-hidden rounded-sm border border-border">
          {pr.kinds.map((k) => (
            <button
              key={k.kind}
              type="button"
              aria-pressed={kind === k.kind}
              onClick={() => setKind(k.kind)}
              className={`cursor-pointer border-none px-2.5 py-1.5 font-mono text-eyebrow ${
                kind === k.kind ? 'bg-accent-soft text-accent-text' : 'bg-transparent text-muted'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('settings.profileName')}
        aria-label={`${t('settings.profileName')} — ${pr.name}`}
        className="field w-32 rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
      />
      <input
        value={cred}
        onChange={(e) => setCred(e.target.value)}
        placeholder={pr.placeholder}
        aria-label={`${pr.fieldLabel} — ${pr.name}`}
        spellCheck={false}
        className="field min-w-0 flex-1 rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!cred.trim()}
        aria-label={`${t('settings.addProfile')} — ${pr.name}`}
        className="cursor-pointer whitespace-nowrap rounded-sm border border-accent-line bg-transparent px-2.5 py-1.5 font-mono text-eyebrow text-accent-text disabled:cursor-default disabled:opacity-[.38]"
      >
        {t('settings.addAction')}
      </button>
    </div>
  )
}

function Providers() {
  const { v } = useStore()
  const { t } = useTranslation()
  const iconBtn =
    'flex cursor-pointer items-center border-none bg-transparent p-1 text-faint outline-none hover:text-text-2 disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  return (
    <>
      <div className={`${LABEL} mb-3`}>{t('settings.providersModels')}</div>
      <div className="mb-4 rounded-md border border-border bg-panel px-4">
        <ToggleRow
          title={t('settings.autoRotate')}
          sub={t('settings.autoRotateDesc')}
          on={v.autoRotate}
          onToggle={v.toggleAutoRotate}
          last={!v.monthUsage}
        />
        {v.monthUsage && (
          <div className="flex items-center justify-between gap-3 px-0.5 py-3">
            <span className="font-mono text-eyebrow tracking-[.12em] text-faint">
              {t('settings.monthUsage')}
            </span>
            <span className="font-mono text-eyebrow text-text-2">{v.monthUsage}</span>
          </div>
        )}
      </div>
      <div className="mb-3 flex flex-col gap-2.5">
        {v.providers.map((pr) => (
          <div key={pr.id} className="rounded-md border border-border bg-panel px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-sm" style={{ background: pr.badgeBg, color: pr.badgeFg }}>
                <ProviderLogo id={pr.id} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body">{pr.name} {pr.rec}</div>
                <div className="text-small text-muted">{pr.sub}</div>
              </div>
              <span className="whitespace-nowrap rounded-xs px-2 py-1 font-mono text-eyebrow" style={{ color: pr.statusFg, background: pr.statusBg }}>
                {pr.badge}
              </span>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 font-mono text-micro tracking-[.12em] text-faint">{t('settings.profilesLabel')}</div>
              <div className="flex flex-col gap-1.5">
                {pr.profiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="whitespace-nowrap rounded-xs bg-fill px-1.5 py-0.5 font-mono text-eyebrow text-muted">{f.kindLabel}</span>
                    <span className="min-w-0 truncate text-small text-text">{f.name}</span>
                    <span className="hidden min-w-0 flex-1 truncate font-mono text-eyebrow text-faint sm:block">
                      {f.credential}
                      {f.usage && <span className="ml-2 text-muted">{f.usage}</span>}
                    </span>
                    {f.inUse && <span className="whitespace-nowrap font-mono text-eyebrow text-accent-text">● {t('settings.profileInUse')}</span>}
                    <span className="ml-auto whitespace-nowrap rounded-xs px-1.5 py-0.5 font-mono text-eyebrow" style={{ color: f.statusFg, background: f.statusBg }}>
                      {f.badge}
                    </span>
                    <button type="button" onClick={f.test} disabled={f.testing} aria-label={`${t('settings.test')} — ${f.name}`} className={`${iconBtn} font-mono text-eyebrow`}>
                      {f.testing ? t('settings.testing') : t('settings.test')}
                    </button>
                    <button type="button" onClick={f.moveUp} disabled={!f.canUp} aria-label={t('settings.moveUp', { name: f.name })} className={iconBtn}>
                      <Icon n="caret" size={13} className="rotate-180" />
                    </button>
                    <button type="button" onClick={f.moveDown} disabled={!f.canDown} aria-label={t('settings.moveDown', { name: f.name })} className={iconBtn}>
                      <Icon n="caret" size={13} />
                    </button>
                    <button type="button" onClick={f.remove} aria-label={t('settings.removeProfile', { name: f.name })} className={iconBtn}>
                      <Icon n="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <AddProfileForm pr={pr} />
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 font-mono text-micro tracking-[.12em] text-faint">{t('settings.modelsAvailable')}</div>
              {pr.needProfileHint && (
                <div className="mb-2 text-small text-muted">{pr.needProfileHint}</div>
              )}
              <div className="flex flex-col gap-1.5">
                {pr.models.map((md) => (
                  <div key={md.id} className="flex items-center gap-2">
                    <span className="font-mono text-meta text-text">{md.name}</span>
                    <span className="font-mono text-eyebrow text-faint">{md.price}</span>
                    <span className="ml-auto flex gap-1.5">
                      <button
                        type="button"
                        aria-pressed={md.smartOn}
                        aria-label={`${t('model.smart')} — ${md.name}`}
                        onClick={md.useSmart}
                        disabled={!md.enabled}
                        className={`cursor-pointer rounded-sm border px-2 py-1 font-mono text-eyebrow disabled:cursor-default disabled:opacity-[.38] ${
                          md.smartOn
                            ? 'border-accent-line bg-accent-soft text-accent-text'
                            : 'border-border bg-transparent text-muted'
                        }`}
                      >
                        {t('model.smart')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={md.fastOn}
                        aria-label={`${t('model.fast')} — ${md.name}`}
                        onClick={md.useFast}
                        disabled={!md.enabled}
                        className={`cursor-pointer rounded-sm border px-2 py-1 font-mono text-eyebrow disabled:cursor-default disabled:opacity-[.38] ${
                          md.fastOn
                            ? 'border-accent-line bg-accent-soft text-accent-text'
                            : 'border-border bg-transparent text-muted'
                        }`}
                      >
                        {t('model.fast')}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {v.advanced && (
        <button type="button" className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent py-1 text-small text-faint"><Icon n="plus" size={13} /> {t('settings.addCustom')}</button>
      )}
    </>
  )
}

/** D4 — inline change-password. Email accounts get the form; social-only
 *  accounts see a note instead. Hidden entirely outside a real session. */
function PasswordSection() {
  const { v } = useStore()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [re, setRe] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!v.accountDeletable) return null
  const FIELD = 'field w-full rounded-sm border border-border bg-panel px-3 py-2 text-body'
  const submit = async () => {
    if (nw.length < 8) {
      setErr(t('account.pwTooShort'))
      return
    }
    if (nw !== re) {
      setErr(t('account.pwMismatch'))
      return
    }
    setBusy(true)
    const e = await v.changePassword(cur, nw)
    setBusy(false)
    if (e) {
      setErr(e)
      return
    }
    setOpen(false)
    setCur('')
    setNw('')
    setRe('')
    setErr(null)
  }
  return (
    <div className="border-t border-border px-0.5 py-3">
      {/* wraps on narrow screens — the note/button drops under the label */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-body">{t('account.pwRow')}</span>
        {v.hasPassword ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="shrink-0 cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-text-2"
          >
            {t('account.pwChange')}
          </button>
        ) : (
          <span className="min-w-0 text-small leading-normal text-muted">
            {t('account.socialOnly')}
          </span>
        )}
      </div>
      {open && v.hasPassword && (
        <div className="mt-3 flex flex-col gap-2">
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} aria-label={t('account.pwCurrent')} placeholder={t('account.pwCurrent')} className={FIELD} />
          <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} aria-label={t('account.pwNew')} placeholder={t('account.pwNew')} className={FIELD} />
          <input type="password" value={re} onChange={(e) => setRe(e.target.value)} aria-label={t('account.pwRepeat')} placeholder={t('account.pwRepeat')} className={FIELD} />
          {err && <div className="text-small text-danger">{err}</div>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="cursor-pointer rounded-sm border-none bg-ink px-3 py-1.5 text-small text-bg disabled:cursor-default disabled:opacity-60"
            >
              {t('account.pwSave')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setErr(null)
              }}
              className="cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-muted"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** D4 — irreversible account deletion behind a typed-email confirmation */
function DangerZone() {
  const { v } = useStore()
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  if (!v.accountDeletable) return null
  const match = email.trim().toLowerCase() === v.userEmail.toLowerCase()
  return (
    <div className="mt-2 rounded-md border border-danger-line px-4 py-3">
      <div className="text-body text-danger-text">{t('account.deleteTitle')}</div>
      <div className="mt-0.5 text-small leading-normal text-muted">{t('account.deleteHelp')}</div>
      {armed ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="font-mono text-micro tracking-[.12em] text-faint" htmlFor="del-email">
            {t('account.deleteConfirmLabel')}
          </label>
          <input
            id="del-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field w-full rounded-sm border border-border bg-panel px-3 py-2 text-body"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!match || busy}
              onClick={async () => {
                setBusy(true)
                await v.deleteAccount()
                setBusy(false)
              }}
              className="cursor-pointer rounded-sm border-none bg-danger-strong px-3 py-1.5 text-small text-on-ink disabled:cursor-default disabled:opacity-50"
            >
              {t('account.deleteConfirm')}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="cursor-pointer rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-muted"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-3 cursor-pointer rounded-sm border border-danger-line bg-transparent px-3 py-1.5 text-small text-danger"
        >
          {t('account.deleteArm')}
        </button>
      )}
    </div>
  )
}

function Assistant() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <div className={`${LABEL} mb-3`}>{t('settings.styleSection')}</div>
      <div role="group" aria-label={t('settings.styleSection')} className="mb-7 flex flex-wrap gap-2">
        <button type="button" aria-pressed={v.styleConcise} onClick={v.toggleConcise} className="cursor-pointer rounded-sm border px-4 py-2 text-left text-ui" style={{ borderColor: v.stConciseBd, background: v.stConciseBg, color: v.stConciseFg }}>{t('vocab.styles.concise')}</button>
        <button type="button" aria-pressed={v.styleWarm} onClick={v.toggleWarm} className="cursor-pointer rounded-sm border px-4 py-2 text-left text-ui" style={{ borderColor: v.stWarmBd, background: v.stWarmBg, color: v.stWarmFg }}>{t('vocab.styles.warm')}</button>
        <button type="button" aria-pressed={v.styleFormal} onClick={v.toggleFormal} className="cursor-pointer rounded-sm border px-4 py-2 text-left text-ui" style={{ borderColor: v.stFormalBd, background: v.stFormalBg, color: v.stFormalFg }}>{t('vocab.styles.formal')}</button>
        <button type="button" aria-pressed={v.styleHumor} onClick={v.toggleHumor} className="cursor-pointer rounded-sm border px-4 py-2 text-left text-ui" style={{ borderColor: v.stHumorBd, background: v.stHumorBg, color: v.stHumorFg }}>{t('vocab.styles.humor')}</button>
      </div>

      <div className="mb-1.5 flex items-baseline justify-between">
        <div className={LABEL}>{t('settings.skillsSection')}</div>
        <span className="text-small text-muted">{t('settings.skillsScope')}</span>
      </div>
      <div className="mb-3 text-ui leading-normal text-muted">{t('settings.skillsHelp')}</div>
      <div className="mb-7 flex flex-col gap-2.5">
        {v.presetsLib.map((pr) => (
          <PresetCard key={pr.id} pr={pr} />
        ))}
      </div>

      <div className={`${LABEL} mb-2`}>
        <label htmlFor="as-system">{t('settings.systemSection')}</label>
      </div>
      <div className="mb-3 text-ui leading-normal text-muted">{t('settings.systemHelp')}</div>
      <textarea
        id="as-system"
        value={v.systemPrompt}
        onChange={(e) => v.setSystemPrompt(e.target.value)}
        placeholder={t('settings.systemPlaceholder')}
        rows={5}
        className="field w-full resize-y rounded-md border border-border bg-panel px-4 py-3 text-body leading-relaxed text-text"
      />
    </>
  )
}
