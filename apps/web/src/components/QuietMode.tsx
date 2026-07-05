import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { NovaMark } from './NovaMark'
import type { Message } from '../state/types'

/** the plain text of a message — focus mode strips everything to the words */
function textOf(m: Message): string {
  return m.blocks
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim()
}

export function QuietMode() {
  const { v } = useStore()
  const { t } = useTranslation()
  if (!v.quiet) return null
  const messages = v.sent.filter((m) => textOf(m) !== '')
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-[dim_.35s_ease]">
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_var(--accent-soft)]" />
      <div className="flex h-16 items-center justify-center gap-2.5">
        <span className="size-1.5 rounded-full bg-accent animate-[breathe_3s_ease-in-out_infinite]" />
        <span className="font-mono text-eyebrow tracking-[.14em] text-muted">
          {t('quiet.header', { clock: v.quietClock })}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto">
        <div className="flex w-[620px] max-w-full flex-col gap-6 px-5 py-8">
          {messages.length === 0 ? (
            <div className="mt-[10vh] text-center text-lead leading-relaxed text-muted">
              {t('quiet.empty')}
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id}>
                {m.role === 'user' ? (
                  <div className="mb-2.5 font-mono text-eyebrow tracking-[.12em] text-muted">
                    {v.userFirstName.toUpperCase()}
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2">
                    <NovaMark size={22} on="--bg" />
                    <span className="font-mono text-eyebrow tracking-[.12em] text-accent-text">
                      {(v.assistantName.trim() || 'Nova').toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-lead leading-relaxed">{textOf(m)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex min-h-20 items-center justify-center px-5 py-3">
        <div className="flex w-[620px] max-w-full items-center gap-3">
          <input
            value={v.draft}
            onChange={v.onDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                v.send()
              }
            }}
            // no provider connected → honestly disabled with the WHY, since the
            // nudge card is hidden behind the focus overlay
            disabled={v.needsProvider}
            aria-label={t('quiet.placeholder')}
            placeholder={v.needsProvider ? t('composer.needProvider') : t('quiet.placeholder')}
            className={`min-w-0 flex-1 border-b border-border bg-transparent pb-2 text-lead text-text outline-none ${
              v.needsProvider ? 'opacity-60' : ''
            }`}
          />
          <button
            type="button"
            onClick={v.exitQuiet}
            className="shrink-0 cursor-pointer rounded-sm border border-border bg-transparent px-3 py-2 text-left text-small text-muted hover:bg-hover-1"
          >
            {t('quiet.exit')}
          </button>
        </div>
      </div>
    </div>
  )
}
