import { useState } from 'react'
import { useStore } from '../state/store'
import { Composer } from '../components/Composer'
import { Icon } from '../components/Icon'
import { MessageView, TypingIndicator } from '../components/MessageView'
import type { MsgState, RespState } from '../state/types'

function respToState(rs: RespState): MsgState | undefined {
  if (rs === 'stream') return 'streaming'
  if (rs === 'error') return 'error'
  if (rs === 'approval') return 'approval'
  return undefined
}

export function ConversationView() {
  const { v } = useStore()
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
        <div ref={v.scrollRef} onScroll={onScroll} tabIndex={0} role="region" aria-label="Hội thoại" className="flex h-full justify-center overflow-y-auto scroll-smooth">
          <div className="w-[680px] max-w-full" style={{ padding: v.convPad }}>
            {v.isEmptyChat && <EmptyChat />}

            {v.sent.map((m, i) => {
              const isLast = i === v.sent.length - 1
              const isAssistant = m.role === 'assistant'
              // the demo conversation's last assistant message showcases the
              // four response states via the switcher; a live reply streams
              const state =
                isLast && isAssistant && v.hasDemo ? respToState(v.respState) : undefined
              const typing = isLast && isAssistant && v.typing
              return <MessageView key={m.id} message={m} state={state} typing={typing} />
            })}

            {/* live "thinking" / writing indicator */}
            {v.typing && <TypingIndicator label={v.typingLabel} />}
          </div>
        </div>

        {away && (
          <button
            type="button"
            aria-label="Cuộn xuống cuối"
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 flex size-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-text-2 shadow-pop outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon n="caret" size={15} />
          </button>
        )}
        </div>

        {/* demo state switcher — only on the scripted demo conversation */}
        {v.hasDemo && (
          <div className="flex shrink-0 justify-center px-3 pt-1">
            <div className="inline-flex items-center gap-1 rounded-sm bg-fill p-0.5 text-meta">
              <span className="px-1.5 text-muted">demo:</span>
              <button type="button" onClick={v.setStream} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgStream, color: v.stFgStream }}>Đang soạn</button>
              <button type="button" onClick={v.setApproval} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgApproval, color: v.stFgApproval }}>Chờ duyệt</button>
              <button type="button" onClick={v.setDone} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgDone, color: v.stFgDone }}>Hoàn tất</button>
              <button type="button" onClick={v.setError} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgError, color: v.stFgError }}>Lỗi</button>
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
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-bg">
        <Icon n="nova" size={22} />
      </div>
      <div className="font-display text-h2">Cuộc trò chuyện mới</div>
      <div className="mt-2 max-w-[420px] text-body leading-normal text-muted">
        Hỏi bất cứ điều gì, đính kèm tệp, hoặc chọn một gợi ý. Nova nhớ ngữ cảnh của dự án{' '}
        <b className="font-semibold text-text">{v.chatProject}</b>.
      </div>
    </div>
  )
}
