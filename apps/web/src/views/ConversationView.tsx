import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Composer } from '../components/Composer'
import { Icon } from '../components/Icon'
import { MessageView } from '../components/MessageView'
import { ProviderNudge } from '../components/ProviderNudge'
import type { MsgState, RespState } from '../state/types'

function respToState(rs: RespState): MsgState | undefined {
  if (rs === 'stream') return 'streaming'
  if (rs === 'error') return 'error'
  if (rs === 'approval') return 'approval'
  return undefined
}

export function ConversationView() {
  const { v } = useStore()
  const { t } = useTranslation()
  // "away from the bottom" — shows the jump-to-latest control
  const [away, setAway] = useState(false)
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setAway(el.scrollHeight - el.scrollTop - el.clientHeight > 300)
  }
  const jumpToBottom = () => {
    const el = v.scrollRef.current
    // setting scrollTop on a DOM node in an event handler is not a React
    // state mutation — the immutability rule false-positives on ref-derived values
    // eslint-disable-next-line react-hooks/immutability
    if (el) el.scrollTop = el.scrollHeight
    setAway(false)
  }
  return (
    <div className="view absolute inset-0 flex">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
        {/* a scrollable region must be keyboard-focusable (axe scrollable-region-focusable); jsx-a11y's noninteractive-tabindex is a false positive here */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div ref={v.scrollRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={t('chat.regionAria')} className="flex h-full justify-center overflow-y-auto overscroll-contain">
          <div className="w-[680px] max-w-full" style={{ padding: v.convPad }}>
            {v.isEmptyChat && (v.needsProvider ? <ProviderNudge /> : <EmptyChat />)}

            {v.sent.map((m, i) => {
              const isLast = i === v.sent.length - 1
              const isAssistant = m.role === 'assistant'
              // a REAL error (no provider / provider failure) drives the
              // danger card on the last assistant message; a pending tool
              // approval renders its prompt there too (agentic surface)
              const state =
                isLast && isAssistant && (v.errorHere || v.respApproval || v.isStream)
                  ? respToState(v.respState)
                  : undefined
              const typing = isLast && isAssistant && v.typing
              return (
                <MessageView key={m.id} message={m} state={state} typing={typing} isLast={isLast} />
              )
            })}

          </div>
        </div>

        {away && (
          <button
            type="button"
            aria-label={t('chat.jumpToLatest')}
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 flex size-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-text-2 shadow-pop outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon n="caret" size={15} />
          </button>
        )}
        </div>


        {/* px-3 matches the Composer wrapper — the two cards must align */}
        {!v.isEmptyChat && (
          <div className="flex justify-center px-3">
            <div className="w-[680px] max-w-full">
              <ProviderNudge compact />
            </div>
          </div>
        )}
        <Composer />
      </div>
    </div>
  )
}

function EmptyChat() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-bg">
        <Icon n="nova" size={22} />
      </div>
      <div className="font-display text-h2">{t('chat.emptyTitle')}</div>
      <div className="mt-2 max-w-[420px] text-body leading-normal text-muted">
        <Trans
          i18nKey="chat.emptyBody"
          values={{ project: v.chatProject }}
          components={{ b: <b className="font-semibold text-text" /> }}
        />
      </div>
    </div>
  )
}
