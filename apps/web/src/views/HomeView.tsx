import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './../components/Icon'
import { Composer } from '../components/Composer'
import { ProviderNudge } from '../components/ProviderNudge'

function greetingKey():
  | 'home.greetingMorning'
  | 'home.greetingNoon'
  | 'home.greetingAfternoon'
  | 'home.greetingEvening' {
  const h = new Date().getHours()
  if (h < 11) return 'home.greetingMorning'
  if (h < 13) return 'home.greetingNoon'
  if (h < 18) return 'home.greetingAfternoon'
  return 'home.greetingEvening'
}

export function HomeView() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div className="flex min-h-full w-[680px] max-w-full flex-col items-center justify-center p-[28px_18px_40px] desktop:p-[40px_16px_48px]">
        <div className="text-[38px] desktop:text-[52px] text-center font-display leading-tight tracking-[-.01em]">
          {t('home.greetingName', { greeting: t(greetingKey()), name: v.userFirstName })}
        </div>
        <div className="mb-8 mt-3 text-center text-lead text-muted">{t('home.tagline')}</div>

        {/* the SAME composer as the conversation view — attachments, project,
            thinking level and tools are identical everywhere, no second-class
            new-chat input */}
        <div className="w-full">
          <Composer placeholder={t('home.inputPlaceholder')} />
        </div>
        <div className="mt-3 w-full">
          <ProviderNudge compact />
        </div>

        <div className="mt-3 grid w-full grid-cols-1 desktop:grid-cols-2 gap-2.5 px-3">
          {v.suggestions.map((g, i) => (
            <button
              type="button"
              key={i}
              onClick={g.go}
              className="w-full cursor-pointer rounded-md border border-border bg-panel px-4 py-3 text-left hover:border-border-hover"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-sm"
                  style={{ background: g.bg, color: g.fg }}
                >
                  <Icon n={g.glyph} size={15} />
                </span>
                <span className="text-body font-medium">{g.title}</span>
              </div>
              <div className="mt-2 text-small leading-normal text-muted">{g.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
