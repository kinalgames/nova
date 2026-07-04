import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Switch from '@radix-ui/react-switch'
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER } from './menu'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { setLanguage, type Language } from '../i18n'
import { Icon, type IconName } from './Icon'
import { ToggleRow } from './ToggleRow'
import { PresetCard } from './PresetCard'
import { ProviderLogo } from './ProviderLogo'
import { BTN_DANGER, BTN_DANGER_OUTLINE, BTN_PRIMARY, BTN_SECONDARY } from './ui'

const TABS = [
  { id: 'general', labelKey: 'settings.tabGeneral', icon: 'settings' },
  { id: 'providers', labelKey: 'settings.tabProviders', icon: 'command' },
  { id: 'assistant', labelKey: 'settings.tabAssistant', icon: 'nova' },
  { id: 'account', labelKey: 'settings.tabAccount', icon: 'user' },
] as const

const LABEL = 'font-mono text-eyebrow tracking-[0.14em] text-faint'

function TabButton({
  tab,
  mobile,
  active,
  onClick,
}: {
  tab: (typeof TABS)[number]
  mobile: boolean
  active: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        // paper-subtle active: background + text colour only, no left rail
        // marker — the tint IS the state
        // mobile: tighter cell + smaller type so all four tabs fit 390px
        // without a hidden horizontal scroll
        'flex flex-shrink-0 items-center cursor-pointer rounded-md border-none text-left outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
        (mobile ? 'tap-sm gap-1.5 px-2 py-1.5 text-small ' : 'gap-2.5 px-3 py-2 text-ui ') +
        (active
          ? 'bg-accent-soft text-accent-text'
          : 'bg-transparent text-text-2 hover:bg-hover-1 active:bg-hover-2')
      }
    >
      {/* mobile drops the icon — four text tabs fit 390px; desktop keeps it */}
      {!mobile && (
        <Icon n={tab.icon} size={16} className={'flex-shrink-0 ' + (active ? '' : 'opacity-50')} />
      )}
      {t(tab.labelKey)}
    </button>
  )
}

export function SettingsDialog() {
  const { v } = useStore()
  const { t } = useTranslation()
  const mobile = v.isMobile
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const shownTabs = query ? TABS.filter((tab) => t(tab.labelKey).toLowerCase().includes(query)) : TABS
  const currentLabel = t(
    TABS.find((tab) => tab.id === v.settingsTab)?.labelKey ?? 'settings.tabGeneral',
  )
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

          {mobile ? (
            // mobile rail: a FIXED top bar — close on the left, tabs scroll
            <div className="flex flex-shrink-0 items-center gap-1 border-b border-border px-2 py-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  className="tap flex flex-shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Icon n="close" size={19} />
                </button>
              </Dialog.Close>
              <div role="tablist" aria-label={t('settings.tabsAria')} className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {TABS.map((tab) => (
                  <TabButton key={tab.id} tab={tab} mobile active={v.settingsTab === tab.id} onClick={() => v.setSettingsTab(tab.id)} />
                ))}
              </div>
            </div>
          ) : (
            // desktop rail: FIXED column — search on top (Claude-style), then tabs
            <div className="flex w-[200px] flex-shrink-0 flex-col border-r border-border bg-side">
              <div className="p-3 pb-2">
                <div className="field flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5">
                  <Icon n="search" size={15} className="flex-shrink-0 text-faint" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t('settings.search')}
                    aria-label={t('settings.search')}
                    className="min-w-0 flex-1 bg-transparent text-small outline-none"
                  />
                </div>
              </div>
              <div className={`${LABEL} px-5 pb-1.5`}>{t('settings.railLabel')}</div>
              <div role="tablist" aria-label={t('settings.tabsAria')} className="flex flex-col gap-0.5 overflow-y-auto px-3 pb-3">
                {shownTabs.map((tab) => (
                  <TabButton key={tab.id} tab={tab} mobile={false} active={v.settingsTab === tab.id} onClick={() => v.setSettingsTab(tab.id)} />
                ))}
                {shownTabs.length === 0 && (
                  <div className="px-3 py-2 text-small text-muted">{t('settings.searchEmpty')}</div>
                )}
              </div>
            </div>
          )}

          {/* right column: FIXED header (title + close) + scrollable content */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div className="font-display text-h3">{currentLabel}</div>
              {!mobile && (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label={t('common.close')}
                    className="flex cursor-pointer rounded-md border-none bg-transparent p-1 text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Icon n="close" size={18} />
                  </button>
                </Dialog.Close>
              )}
            </div>
            <div role="tabpanel" className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-5">
              {v.settingsTab === 'general' && <General />}
              {v.settingsTab === 'providers' && <Providers />}
              {v.settingsTab === 'assistant' && <Assistant />}
              {v.settingsTab === 'account' && <Account />}
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
      className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small"
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
        <button type="button" aria-pressed={v.themeVal === 'light'} onClick={v.setLight} className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeLightBd, background: v.themeLightBg, color: v.themeLightFg }}>{t('settings.themeLight')}</button>
        <button type="button" aria-pressed={v.themeVal === 'dark'} onClick={v.setDark} className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeDarkBd, background: v.themeDarkBg, color: v.themeDarkFg }}>{t('settings.themeDark')}</button>
        <button type="button" aria-pressed={v.themeVal === 'auto'} onClick={v.setAuto} className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeAutoBd, background: v.themeAutoBg, color: v.themeAutoFg }}>{t('settings.themeAuto')}</button>
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
          <button type="button" aria-pressed={v.focusVal === '15'} onClick={v.setF15} className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f15Bd, background: v.f15Bg, color: v.f15Fg }}>15′</button>
          <button type="button" aria-pressed={v.focusVal === '25'} onClick={v.setF25} className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f25Bd, background: v.f25Bg, color: v.f25Fg }}>25′</button>
          <button type="button" aria-pressed={v.focusVal === '50'} onClick={v.setF50} className="tap-sm cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f50Bd, background: v.f50Bg, color: v.f50Fg }}>50′</button>
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
                className={BTN_DANGER}
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
              className={`${BTN_DANGER_OUTLINE} shrink-0`}
            >
              {t('settings.clearAllAction')}
            </button>
          )}
        </div>
      </div>

    </>
  )
}

/** D5/D4 — the account tab: identity, email-verification status, password,
 *  and the irreversible delete. Split out of General so account management
 *  lives on its own, uncluttered surface. */
function Account() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-center gap-3 px-0.5 py-3">
        <div className="size-[38px] shrink-0 rounded-full bg-[linear-gradient(135deg,#E0A06B,var(--accent))]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body">{v.userName}</div>
          <div className="truncate text-small text-muted">{v.userEmail} · {t('user.plan')}</div>
        </div>
        <button type="button" onClick={v.logout} className="cursor-pointer border-none bg-transparent text-small text-faint hover:text-text-2">{t('nav.logout')}</button>
      </div>

      <div className={`${LABEL} mb-1.5 mt-6`}>{t('settings.emailSection')}</div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-0.5 py-3">
        <div className="min-w-0">
          <div className="truncate text-body">{v.userEmail}</div>
          {v.emailVerified ? (
            <div className="mt-0.5 flex items-center gap-1 text-small text-accent-text">
              <Icon n="check" size={13} /> {t('settings.emailVerified')}
            </div>
          ) : (
            <div className="mt-0.5 text-small text-muted">{t('settings.emailUnverified')}</div>
          )}
        </div>
        {!v.emailVerified && v.accountDeletable && (
          <button type="button" onClick={() => void v.resendVerify()} className={`${BTN_SECONDARY} shrink-0`}>
            {t('chat.verifyCta')}
          </button>
        )}
      </div>

      <PasswordSection />
      <DangerZone />
    </>
  )
}

type ProviderVM = ReturnType<typeof useStore>['v']['providers'][number]

/** inline add-profile form — kind picker (「Tài khoản」/「Khóa API」) + label + credential */
/** Progressive add-profile: two calm buttons by default (đăng nhập tài
 *  khoản / thêm khóa API); the form — ONE kind's fields only — appears when
 *  a path is chosen. Nothing the user hasn't asked for is on screen. */
function AddProfileForm({ pr }: { pr: ProviderVM }) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<null | (typeof pr.kinds)[number]['kind']>(null)
  const [name, setName] = useState('')
  const [cred, setCred] = useState('')
  const close = () => {
    setKind(null)
    setName('')
    setCred('')
  }
  const submit = () => {
    if (!kind || !cred.trim()) return
    pr.addProfile(kind, name, cred)
    close()
  }
  if (kind === null)
    return (
      <div className="mt-2.5 flex flex-wrap gap-2">
        {pr.kinds.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind(k.kind)}
            aria-label={`${k.cta} — ${pr.name}`}
            className="tap-sm flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-transparent px-3 py-1.5 text-small text-text-2 outline-none hover:bg-hover-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon n={k.kind === 'account' ? 'user' : 'plus'} size={14} />
            {k.cta}
          </button>
        ))}
      </div>
    )
  const active = pr.kinds.find((k) => k.kind === kind)!
  return (
    <div className="mt-2.5 rounded-md border border-border bg-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-eyebrow tracking-[.12em] text-label">{active.cta}</span>
        <button
          type="button"
          onClick={close}
          aria-label={t('common.cancel')}
          className="tap-sm flex cursor-pointer items-center justify-center border-none bg-transparent p-1 text-faint hover:text-text-2"
        >
          <Icon n="close" size={13} />
        </button>
      </div>
      {active.help && <div className="mb-2.5 text-small leading-normal text-muted">{active.help}</div>}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.profileName')}
          aria-label={`${t('settings.profileName')} — ${pr.name}`}
          className="field w-32 max-sm:w-full rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
        />
        <input
          value={cred}
          onChange={(e) => setCred(e.target.value)}
          placeholder={kind === 'account' ? active.placeholder : pr.placeholder}
          aria-label={`${pr.fieldLabel} — ${pr.name}`}
          spellCheck={false}
          className="field min-w-0 flex-1 basis-[12rem] rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!cred.trim()}
          aria-label={`${t('settings.addProfile')} — ${pr.name}`}
          className="tap-sm cursor-pointer whitespace-nowrap rounded-sm border border-accent-line bg-transparent px-2.5 py-1.5 font-mono text-eyebrow text-accent-text disabled:cursor-default disabled:opacity-[.38]"
        >
          {t('settings.addAction')}
        </button>
      </div>
    </div>
  )
}

function Providers() {
  const { v } = useStore()
  const { t } = useTranslation()
  const iconBtn =
    'flex cursor-pointer items-center whitespace-nowrap border-none bg-transparent p-1 text-faint outline-none hover:text-text-2 disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
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
            <span className="shrink-0 whitespace-nowrap font-mono text-eyebrow tracking-[.12em] text-faint">
              {t('settings.monthUsage')}
            </span>
            <span className="min-w-0 text-right font-mono text-eyebrow text-text-2">{v.monthUsage}</span>
          </div>
        )}
      </div>
      <div className="mb-3 flex flex-col gap-2.5">
        {v.providers.map((pr) => (
          <div key={pr.id} className="rounded-md border border-border bg-panel px-4 py-3">
            {/* collapsed row IS the toggle — config expands per provider */}
            <button
              type="button"
              aria-expanded={pr.open}
              aria-label={t('settings.providerToggle', { name: pr.name })}
              onClick={pr.toggle}
              className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-left font-[inherit]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-sm" style={{ background: pr.badgeBg, color: pr.badgeFg }}>
                <ProviderLogo id={pr.id} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body">{pr.name} {pr.rec}</div>
                <div className="text-small text-muted">{pr.open ? pr.sub : pr.summary}</div>
              </div>
              <span className="whitespace-nowrap rounded-xs px-2 py-1 font-mono text-eyebrow" style={{ color: pr.statusFg, background: pr.statusBg }}>
                {pr.badge}
              </span>
              <Icon n="caret" size={14} className={`shrink-0 text-faint transition-transform duration-150 ${pr.open ? 'rotate-180' : ''}`} />
            </button>

            {pr.open && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 font-mono text-micro tracking-[.12em] text-faint">{t('settings.profilesLabel')}</div>
              <div className="flex flex-col gap-1.5">
                {pr.profiles.map((f) => (
                  <div key={f.id}>
                    <div className="flex items-center gap-x-2">
                      <span className="whitespace-nowrap rounded-xs bg-fill px-1.5 py-0.5 font-mono text-eyebrow text-muted">{f.kindLabel}</span>
                      <span className="min-w-0 flex-1 truncate text-small text-text">
                        {f.name}
                        {f.inUse && <span className="ml-1.5 font-mono text-eyebrow text-accent-text">●</span>}
                      </span>
                      <span className="hidden min-w-0 max-w-[14rem] truncate font-mono text-eyebrow text-faint sm:block">
                        {f.credential}
                      </span>
                      <span className="whitespace-nowrap rounded-xs px-1.5 py-0.5 font-mono text-eyebrow" style={{ color: f.statusFg, background: f.statusBg }}>
                        {f.badge}
                      </span>
                      <button type="button" onClick={f.test} disabled={f.testing} aria-label={`${t('settings.test')} — ${f.name}`} className={`${iconBtn} tap-sm font-mono text-eyebrow`}>
                        {f.testing ? t('settings.testing') : t('settings.test')}
                      </button>
                      {/* secondary actions live behind “…” — the row stays calm */}
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button type="button" aria-label={t('settings.profileMenu', { name: f.name })} className={`${iconBtn} tap-sm justify-center`}>
                            <Icon n="more" size={14} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content align="end" sideOffset={6} className={MENU_CONTENT}>
                            <DropdownMenu.Item disabled={!f.canUp} onSelect={f.moveUp} className={MENU_ITEM}>
                              {t('settings.menuMoveUp')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item disabled={!f.canDown} onSelect={f.moveDown} className={MENU_ITEM}>
                              {t('settings.menuMoveDown')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={f.remove} className={MENU_ITEM_DANGER}>
                              {t('settings.menuRemove')}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                    {f.usage && <div className="mt-0.5 pl-1 font-mono text-eyebrow text-muted">{f.usage}</div>}
                    {/* WHY the test failed — never a mute “Thất bại” */}
                    {f.error && (
                      <div className="mt-1 rounded-sm border border-danger-line bg-danger-bg px-2 py-1 font-mono text-eyebrow leading-normal text-danger-text">
                        {f.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <AddProfileForm pr={pr} />
              {pr.id === 'ollama' && <OllamaSection />}
            </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/** B6c — the ollama config carries its DYNAMIC catalog: models the endpoint
 *  serves (with real caps) plus a pull form with streamed progress. */
function OllamaSection() {
  const { v } = useStore()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const cat = v.ollamaCatalog
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-micro tracking-[.12em] text-faint">{t('settings.ollamaModels')}</span>
        <button
          type="button"
          onClick={cat.refresh}
          className="cursor-pointer border-none bg-transparent p-0 font-mono text-eyebrow text-muted hover:text-text"
        >
          {t('settings.ollamaRefresh')}
        </button>
      </div>
      {cat.models.length === 0 && (
        <div className="mb-2 text-small text-muted">{t('settings.ollamaEmpty')}</div>
      )}
      <div className="mb-2 flex flex-col gap-1">
        {cat.models.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <span className="min-w-0 truncate font-mono text-small text-text">{m.name}</span>
            <CapIcons caps={m.caps} />
            <span className="ml-auto whitespace-nowrap font-mono text-eyebrow text-faint">{m.size}</span>
          </div>
        ))}
      </div>
      {cat.pulling ? (
        <div className="text-small text-muted" role="status">
          {t('settings.ollamaPulling', {
            model: cat.pulling.model,
            pct: cat.pulling.pct ?? '…',
          })}
          {cat.pulling.status && <span className="ml-2 font-mono text-eyebrow text-faint">{cat.pulling.status}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.ollamaPullPlaceholder')}
            aria-label={t('settings.ollamaPullAria')}
            spellCheck={false}
            className="field min-w-0 flex-1 rounded-sm border border-border bg-panel px-2.5 py-1.5 font-mono text-small text-text"
          />
          <button
            type="button"
            onClick={() => {
              cat.pull(name)
              setName('')
            }}
            disabled={!name.trim()}
            className="cursor-pointer whitespace-nowrap rounded-sm border border-accent-line bg-transparent px-2.5 py-1.5 font-mono text-eyebrow text-accent-text disabled:cursor-default disabled:opacity-[.38]"
          >
            {t('settings.ollamaPull')}
          </button>
        </div>
      )}
    </div>
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
              className={BTN_PRIMARY}
            >
              {t('account.pwSave')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setErr(null)
              }}
              className={BTN_SECONDARY}
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
              className={BTN_DANGER}
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
          className={`${BTN_DANGER_OUTLINE} mt-3`}
        >
          {t('account.deleteArm')}
        </button>
      )}
    </div>
  )
}

/** capability glyphs on a model row — each carries its own tooltip/aria */
function CapIcons({ caps }: { caps: { reasoning?: boolean; vision?: boolean; audio?: boolean; imageGen?: boolean; toolUse?: boolean } }) {
  const { t } = useTranslation()
  const items = [
    caps.reasoning && (['think', t('model.capReasoning')] as const),
    caps.vision && (['eye', t('model.capVision')] as const),
    caps.audio && (['mic', t('model.capAudio')] as const),
    caps.imageGen && (['image', t('model.capImageGen')] as const),
    caps.toolUse && (['wrench', t('model.capToolUse')] as const),
  ].filter(Boolean) as (readonly [IconName, string])[]
  if (items.length === 0) return null
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-faint">
      {items.map(([n, label]) => (
        <span key={n} title={label} aria-label={label} role="img" className="flex">
          <Icon n={n} size={13} />
        </span>
      ))}
    </span>
  )
}

type SlotChoice = ReturnType<typeof useStore>['v']['smartChoices'][number]

function SlotPicker({ title, desc, choices }: { title: string; desc: string; choices: SlotChoice[] }) {
  const { t } = useTranslation()
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-body font-semibold">{title}</span>
        <span className="text-small text-muted">{desc}</span>
      </div>
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-1">
        {choices.map((c) => (
          <div
            key={c.key}
            className={`relative flex items-center gap-2.5 rounded-sm border px-3 py-2 ${
              c.active ? 'border-accent-line bg-accent-soft' : 'border-border bg-transparent'
            } ${c.connected ? '' : 'opacity-60'}`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-xs" style={{ background: c.badgeBg, color: c.badgeFg }}>
              <ProviderLogo id={c.providerId} size={12} />
            </span>
            {c.connected ? (
              <button
                type="button"
                role="radio"
                aria-checked={c.active}
                aria-label={`${title} — ${c.name}`}
                onClick={c.pick}
                className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-0.5 border-none bg-transparent p-0 text-left font-[inherit]"
              >
                <span className="min-w-0 truncate text-ui text-text">{c.name}</span>
                {c.legacy && <span className="rounded-xs bg-fill px-1 py-0.5 font-mono text-micro text-muted">{c.legacy}</span>}
                <CapIcons caps={c.caps} />
                {/* mobile: the meta drops to its own quiet second line */}
                <span className="ml-auto whitespace-nowrap font-mono text-eyebrow text-faint max-sm:ml-0 max-sm:w-full">{c.meta}</span>
                {c.active && <Icon n="check" size={14} className="shrink-0 text-accent max-sm:absolute max-sm:right-3" />}
              </button>
            ) : (
              <>
                <span className="min-w-0 truncate text-ui text-muted">{c.name}</span>
                <CapIcons caps={c.caps} />
                <span className="ml-auto whitespace-nowrap font-mono text-eyebrow text-faint max-sm:hidden">{c.meta}</span>
                <button
                  type="button"
                  onClick={c.connect}
                  aria-label={`${t('settings.connectCta')} — ${c.providerName}`}
                  className="shrink-0 cursor-pointer whitespace-nowrap rounded-sm border border-accent-line bg-transparent px-2 py-1 font-mono text-eyebrow text-accent-text"
                >
                  {t('settings.connectCta')}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Assistant() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <div className={`${LABEL} mb-1.5`}>{t('settings.modelSection')}</div>
      <div className="mb-3 text-ui leading-normal text-muted">{t('settings.modelHelp')}</div>
      <SlotPicker title={t('model.smart')} desc={t('model.smartDesc')} choices={v.smartChoices} />
      <div className="mb-7">
        <SlotPicker title={t('model.fast')} desc={t('model.fastDesc')} choices={v.fastChoices} />
      </div>

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
