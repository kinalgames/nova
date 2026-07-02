import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { setLanguage, type Language } from '../i18n'
import { Icon } from './Icon'
import { ToggleRow } from './ToggleRow'
import { PresetCard } from './PresetCard'

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
        <Dialog.Overlay className="fixed inset-0 z-[55] animate-[dim_140ms_ease] bg-[rgba(20,18,15,0.45)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={
            mobile
              ? 'fixed inset-0 z-[56] flex flex-col bg-bg outline-none animate-[slideR_180ms_ease]'
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
                      : 'bg-transparent text-text-2 hover:bg-black/[0.04]')
                  }
                >
                  <Icon n={tab.icon} size={16} className={'flex-shrink-0 ' + (active ? 'text-accent' : 'opacity-50')} />
                  {t(tab.labelKey)}
                </button>
              )
            })}
          </div>

          {/* panel */}
          <div role="tabpanel" className="min-w-0 flex-1 overflow-y-auto">
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
      <div className="flex flex-wrap gap-1.5 border-b border-border px-0.5 pb-4 pt-0.5">
        <button type="button" aria-pressed={v.themeVal === 'light'} onClick={v.setLight} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeLightBd, background: v.themeLightBg, color: v.themeLightFg }}>{t('settings.themeLight')}</button>
        <button type="button" aria-pressed={v.themeVal === 'dark'} onClick={v.setDark} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeDarkBd, background: v.themeDarkBg, color: v.themeDarkFg }}>{t('settings.themeDark')}</button>
        <button type="button" aria-pressed={v.themeVal === 'auto'} onClick={v.setAuto} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.themeAutoBd, background: v.themeAutoBg, color: v.themeAutoFg }}>{t('settings.themeAuto')}</button>
      </div>

      <div className={`${LABEL} mb-3 mt-4`}>{t('settings.language')}</div>
      <div className="flex flex-wrap gap-1.5 border-b border-border px-0.5 pb-4 pt-0.5">
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
        <div className="flex shrink-0 gap-1.5">
          <button type="button" aria-pressed={v.focusVal === '15'} onClick={v.setF15} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f15Bd, background: v.f15Bg, color: v.f15Fg }}>15′</button>
          <button type="button" aria-pressed={v.focusVal === '25'} onClick={v.setF25} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f25Bd, background: v.f25Bg, color: v.f25Fg }}>25′</button>
          <button type="button" aria-pressed={v.focusVal === '50'} onClick={v.setF50} className="cursor-pointer rounded-sm border px-3 py-1 text-small" style={{ borderColor: v.f50Bd, background: v.f50Bg, color: v.f50Fg }}>50′</button>
        </div>
      </div>

      <div className={`${LABEL} mb-1.5 mt-6`}>{t('settings.account')}</div>
      <div className="flex items-center gap-3 px-0.5 py-3">
        <div className="size-[38px] shrink-0 rounded-full bg-[linear-gradient(135deg,#E0A06B,var(--accent))]" />
        <div className="min-w-0 flex-1">
          <div className="text-body">{t('user.name')}</div>
          <div className="text-small text-muted">minh@aurora.studio · {t('user.plan')}</div>
        </div>
        <button type="button" onClick={v.logout} className="cursor-pointer border-none bg-transparent text-small text-faint">{t('nav.logout')}</button>
      </div>
    </>
  )
}

function Providers() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <div className={`${LABEL} mb-3`}>{t('settings.providersModels')}</div>
      <div className="mb-3 flex flex-col gap-2.5">
        {v.providers.map((pr) => (
          <div key={pr.id} className="rounded-md border px-4 py-3" style={{ borderColor: pr.border, background: pr.bg }}>
            <button type="button" onClick={pr.select} aria-pressed={pr.active} aria-label={t('settings.useProvider', { name: pr.name })} className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-sm font-mono text-body" style={{ background: pr.badgeBg, color: pr.badgeFg }}>
                {pr.glyph}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body">{pr.name} {pr.rec}</div>
                <div className="text-small text-muted">{pr.sub}</div>
              </div>
              <span className="whitespace-nowrap rounded-xs px-2 py-1 font-mono text-eyebrow" style={{ color: pr.statusFg, background: pr.statusBg }}>
                {pr.badge}
              </span>
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: pr.radioBd, background: pr.radioBg }}>
                <span className="size-[7px] rounded-full" style={{ background: pr.radioDot }} />
              </span>
            </button>
            {pr.showKey && (
              <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                <div>
                  <label className="mb-1.5 block font-mono text-micro tracking-[.12em] text-faint">{pr.fieldLabel}</label>
                  <div className="field flex items-center gap-2 rounded-sm border border-border bg-panel py-1.5 pl-3 pr-2">
                    <input
                      value={pr.fieldValue}
                      onChange={(e) => pr.setKey(e.target.value)}
                      aria-label={`${pr.fieldLabel} — ${pr.name}`}
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent font-mono text-small text-text"
                    />
                    <button type="button" onClick={pr.test} disabled={pr.testing} className="cursor-pointer whitespace-nowrap rounded-sm border border-accent-line bg-transparent px-2 py-1 font-mono text-eyebrow text-accent-text">
                      {pr.testing ? t('settings.testing') : pr.fieldAction}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-mono text-micro tracking-[.12em] text-faint">{t('settings.modelsAvailable')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pr.models.map((md, i) => (
                      <span key={i} className="rounded-sm border px-2.5 py-1 font-mono text-meta" style={{ color: md.fg, background: md.bg, borderColor: md.bd }}>
                        {md.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {v.advanced && (
        <button type="button" className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent py-1 text-small text-faint"><Icon n="plus" size={13} /> {t('settings.addCustom')}</button>
      )}
    </>
  )
}

function Assistant() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <>
      <div className={`${LABEL} mb-3`}>{t('settings.styleSection')}</div>
      <div className="mb-7 flex flex-wrap gap-2">
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

      <div className={`${LABEL} mb-2`}>{t('settings.systemSection')}</div>
      <div className="mb-3 text-ui leading-normal text-muted">{t('settings.systemHelp')}</div>
      <div className="rounded-md border border-border bg-panel px-4 py-4 text-body leading-relaxed text-text">
        {t('settings.systemSample')}
      </div>
    </>
  )
}
