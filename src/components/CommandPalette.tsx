import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import type { IconName } from './Icon'

const row =
  'flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-3 text-left text-body text-text ' +
  'outline-none hover:bg-black/[0.035] focus-visible:bg-black/[0.05]'
const SECTION = 'px-3 pb-1 pt-2 font-mono text-micro tracking-[0.14em] text-faint'

/** diacritic-insensitive fold so "khao sat" matches "Khảo sát" */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()

export function CommandPalette() {
  const { v } = useStore()
  const q = fold(v.q.trim())
  const hit = (label: string) => q !== '' && fold(label).includes(q)

  const actions: { label: string; icon: IconName; run: () => void }[] = [
    { label: 'Cuộc trò chuyện mới', icon: 'plus', run: v.pNewChat },
    { label: 'Vào chế độ tập trung', icon: 'focus', run: v.pQuiet },
    { label: 'Tất cả dự án', icon: 'file', run: v.pProjects },
    { label: 'Nova · trợ lý', icon: 'nova', run: v.pAssistant },
    { label: 'Cài đặt', icon: 'settings', run: v.pSettings },
  ]

  const convHits = q ? v.paletteConvs.filter((c) => hit(c.title)) : []
  const projHits = q ? v.paletteProjects.filter((p) => hit(p.name)) : []
  const actHits = q ? actions.filter((a) => hit(a.label)) : []
  const nothing = q !== '' && convHits.length + projHits.length + actHits.length === 0

  return (
    <Dialog.Root
      open={v.palette}
      onOpenChange={(o) => {
        if (!o) v.closeMenus()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-[dim_120ms_ease] bg-[rgba(27,26,22,0.2)]" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ top: v.paletteTop }}
          className="fixed left-1/2 z-40 w-[560px] max-w-[94vw] -translate-x-1/2 animate-[fadeUp_150ms_var(--ease-paper)] overflow-hidden rounded-lg border border-border bg-panel shadow-overlay outline-none"
        >
          <VisuallyHidden asChild>
            <Dialog.Title>Bảng lệnh</Dialog.Title>
          </VisuallyHidden>
          <div className="flex h-[58px] items-center gap-3 border-b border-border px-4">
            <Icon n="search" size={18} className="text-faint" />
            <input
              value={v.q}
              onChange={v.onQ}
              placeholder="Tìm cuộc trò chuyện, dự án, hành động…"
              className="min-w-0 flex-1 bg-transparent text-lead text-text outline-none"
            />
            <span className="rounded-xs border border-border px-1.5 py-0.5 font-mono text-eyebrow text-faint">
              esc
            </span>
          </div>
          <div className="max-h-[52vh] overflow-y-auto p-2">
            {q === '' ? (
              <>
                <div className={SECTION}>ĐI TỚI</div>
                <button onClick={v.goProject} className={row}>
                  <span className="size-[9px] rounded-xs bg-accent" />
                  <span className="flex-1">Dự án · {v.activeProjectName}</span>
                </button>
                <button onClick={v.pProjects} className={row}>
                  <Icon n="file" size={16} className="text-muted" />
                  <span className="flex-1">Tất cả dự án</span>
                </button>
                <button onClick={v.pAssistant} className={row}>
                  <Icon n="nova" size={16} className="text-muted" />
                  <span className="flex-1">Nova · trợ lý</span>
                </button>
                <button onClick={v.pSettings} className={row}>
                  <Icon n="settings" size={16} className="text-muted" />
                  <span className="flex-1">Cài đặt</span>
                </button>
                <div className={SECTION}>HÀNH ĐỘNG</div>
                <button onClick={v.pNewChat} className={row}>
                  <Icon n="plus" size={16} className="text-muted" />
                  <span className="flex-1">Cuộc trò chuyện mới</span>
                </button>
                <button onClick={v.pQuiet} className={`${row} bg-accent-soft`}>
                  <Icon n="focus" size={16} className="text-accent" />
                  <span className="flex-1">Vào chế độ tập trung</span>
                </button>
              </>
            ) : nothing ? (
              <div className="px-3 py-8 text-center text-body text-muted">
                Không có kết quả cho “{v.q.trim()}”
              </div>
            ) : (
              <>
                {convHits.length > 0 && (
                  <>
                    <div className={SECTION}>CUỘC TRÒ CHUYỆN</div>
                    {convHits.map((c) => (
                      <button key={c.id} onClick={c.open} className={row}>
                        <Icon n="write" size={16} className="text-muted" />
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                        <span className="shrink-0 font-mono text-eyebrow text-faint">
                          {c.projectName}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {projHits.length > 0 && (
                  <>
                    <div className={SECTION}>DỰ ÁN</div>
                    {projHits.map((p) => (
                      <button key={p.id} onClick={p.open} className={row}>
                        <span className="size-[9px] rounded-xs" style={{ background: p.dot }} />
                        <span className="flex-1">{p.name}</span>
                      </button>
                    ))}
                  </>
                )}
                {actHits.length > 0 && (
                  <>
                    <div className={SECTION}>HÀNH ĐỘNG</div>
                    {actHits.map((a) => (
                      <button key={a.label} onClick={a.run} className={row}>
                        <Icon n={a.icon} size={16} className="text-muted" />
                        <span className="flex-1">{a.label}</span>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
