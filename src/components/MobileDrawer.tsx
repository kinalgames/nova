import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useStore } from '../state/store'
import { Icon } from './Icon'

const navRow =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[14px] outline-none hover:bg-black/[0.035] focus-visible:bg-black/[0.05]'

export function MobileDrawer() {
  const { v } = useStore()
  return (
    <Dialog.Root
      open={v.drawerOpen}
      onOpenChange={(o) => {
        if (!o) v.closeDrawer()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[48] animate-[dim_120ms_ease] bg-[rgba(27,26,22,0.28)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-[49] flex w-[282px] max-w-[84vw] flex-col overflow-hidden bg-side animate-[slideR_200ms_ease] outline-none"
        >
          <VisuallyHidden asChild>
            <Dialog.Title>Điều hướng</Dialog.Title>
          </VisuallyHidden>
          <div className="flex h-14 flex-shrink-0 items-center justify-between pl-[18px] pr-3.5">
            <div className="flex items-center gap-[9px]">
              <div className="size-[13px] rounded-full bg-ink shadow-[inset_-3px_-3px_0_var(--side)]" />
              <span className="font-display text-[21px]">Nova</span>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Đóng"
                className="tap flex cursor-pointer border-none bg-transparent text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon n="close" size={17} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-1.5 px-3">
            <button onClick={v.pNewChat} className={`${navRow} border border-border bg-panel`}>
              <Icon n="plus" size={17} />
              <span>Cuộc trò chuyện mới</span>
            </button>
            <button onClick={v.togglePalette} className={`${navRow} text-muted`}>
              <Icon n="search" size={17} />
              <span>Tìm</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-3.5">
            <div className="px-2 pb-2 font-mono text-[9.5px] tracking-[0.14em] text-label">DỰ ÁN</div>
            {v.sideProjects.map((p, i) => (
              <button key={i} onClick={p.open} className={navRow} style={{ background: p.bg }}>
                <span className="size-[9px] rounded-[3px]" style={{ background: p.dot }} />
                <span className="flex-1" style={{ color: p.fg }}>
                  {p.name}
                </span>
              </button>
            ))}
            <div className="px-2 pb-2 pt-[18px] font-mono text-[9.5px] tracking-[0.14em] text-label">
              GẦN ĐÂY · AURORA
            </div>
            {v.sideConvs.map((c) => (
              <button key={c.id} onClick={c.open} className={navRow} style={{ background: c.bg }}>
                <span className="size-[5px] rounded-full" style={{ background: c.dot }} />
                <span className="flex-1 truncate text-[13.5px]" style={{ color: c.fg }}>
                  {c.title}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-shrink-0 border-t border-border px-3 pb-3.5 pt-2">
            <button onClick={v.goAssistant} className={navRow} style={{ color: v.novaFg }}>
              <Icon n="nova" size={16} />
              <span>Nova</span>
            </button>
            <button onClick={v.goSettings} className={navRow} style={{ color: v.setFg }}>
              <Icon n="settings" size={16} />
              <span>Cài đặt</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
