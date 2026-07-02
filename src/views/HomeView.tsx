import { useStore } from '../state/store'
import { Icon } from './../components/Icon'
import { GrowingTextarea } from '../components/GrowingTextarea'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 13) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export function HomeView() {
  const { v } = useStore()
  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div
        className="flex min-h-full w-[640px] max-w-full flex-col items-center justify-center"
        style={{ padding: v.homePad }}
      >
        <div
          className="text-center font-display leading-tight tracking-[-.01em]"
          style={{ fontSize: v.heroSize }}
        >
          {greeting()}, Minh.
        </div>
        <div className="mt-3 text-center text-lead text-muted">
          Mình là Nova. Bạn muốn làm gì hôm nay?
        </div>
        <div className="field mt-8 flex w-full items-end gap-3 rounded-lg border border-border bg-panel px-4 py-4">
          <GrowingTextarea
            value={v.draft}
            onChange={v.onDraft}
            onKeyDown={v.onKey}
            aria-label="Nhắn cho Nova"
            placeholder="Nhắn cho Nova…"
            className="min-w-0 flex-1 text-lead text-text"
          />
          <button
            type="button"
            aria-label="Gửi"
            onClick={v.send}
            disabled={!v.canSend}
            className="tap flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-ink text-bg opacity-100 transition-opacity duration-[120ms] disabled:cursor-default disabled:opacity-[.38]"
          >
            <Icon n="send" size={17} stroke={2} />
          </button>
        </div>
        <div className="mt-3 grid w-full gap-2.5" style={{ gridTemplateColumns: v.sugCols }}>
          {v.suggestions.map((g, i) => (
            <button
              type="button"
              key={i}
              onClick={g.go}
              className="w-full cursor-pointer rounded-md border border-border bg-panel px-4 py-3 text-left hover:border-[#d9d2c4]"
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
