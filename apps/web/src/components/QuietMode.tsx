import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { getSeed } from '../data/seed'
import { Icon } from './Icon'

export function QuietMode() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.quiet) return null
  const sample = getSeed().quiet
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-[dim_.35s_ease]">
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_var(--accent-soft)]" />
      <div className="flex h-16 items-center justify-center gap-2.5">
        <span className="size-1.5 rounded-full bg-accent animate-[breathe_3s_ease-in-out_infinite]" />
        <span className="font-mono text-eyebrow tracking-[.14em] text-muted">{t('quiet.header', { clock: v.quietClock })}</span>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto">
        <div className="w-[620px] max-w-full px-5 py-8">
          <div className="mb-2.5 font-mono text-eyebrow tracking-[.12em] text-muted">
            {v.userFirstName.toUpperCase()}
          </div>
          <div className="text-lead leading-normal">{sample.user}</div>
          <div className="h-[26px]" />
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-[22px] items-center justify-center rounded-full bg-accent text-bg">
              <Icon n="nova" size={13} />
            </span>
            <span className="font-mono text-eyebrow tracking-[.12em] text-accent-text">
              {(v.assistantName.trim() || 'Nova').toUpperCase()}
            </span>
          </div>
          <div className="text-lead leading-relaxed">
            {sample.intro}
            <br />
            <br />
            {sample.risks.map((r, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {i + 1} · <b className="font-semibold">{r.t}</b> {r.d}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex min-h-20 items-center justify-center px-5 py-3">
        <div className="flex w-[620px] max-w-full items-center gap-3 opacity-[.85]">
          <input
            placeholder={t('quiet.placeholder')}
            className="min-w-0 flex-1 border-b border-border pb-2 text-lead text-text"
          />
          <button
            type="button"
            onClick={v.exitQuiet}
            className="shrink-0 cursor-pointer rounded-sm border border-border bg-transparent px-3 py-2 text-left text-small text-muted"
          >
            {t('quiet.exit')}
          </button>
        </div>
      </div>
    </div>
  )
}
