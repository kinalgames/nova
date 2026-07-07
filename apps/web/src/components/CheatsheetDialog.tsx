import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'

const ROWS = [
  { keys: '⌘K', label: 'cheatsheet.palette' },
  { keys: '⌘.', label: 'cheatsheet.focus' },
  { keys: '⏎', label: 'cheatsheet.send' },
  { keys: '⇧⏎', label: 'cheatsheet.newline' },
  { keys: 'Esc', label: 'cheatsheet.close' },
] as const

/** keyboard-shortcuts cheatsheet — lists only shortcuts that actually exist */
export function CheatsheetDialog() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <Dialog.Root open={v.cheatsheet} onOpenChange={(o) => !o && v.closeCheatsheet()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_120ms_ease] bg-scrim" />
        <Dialog.Content className="fixed left-1/2 top-[24%] z-[60] w-[380px] max-w-[92vw] -translate-x-1/2 animate-[fadeUp_150ms_var(--ease-paper)] rounded-lg border border-border bg-panel p-6 shadow-overlay outline-none">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-h3">{t('cheatsheet.title')}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t('common.close')}
                className="tap-sm -mr-1 -mt-1 flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon n="close" size={17} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 mt-1 text-ui text-muted">
            {t('cheatsheet.sub')}
          </Dialog.Description>
          <div className="flex flex-col">
            {ROWS.map((r) => (
              <div
                key={r.keys}
                className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0"
              >
                <span className="text-body text-text">{t(r.label)}</span>
                <kbd className="rounded-xs border border-border bg-fill px-2 py-0.5 font-mono text-eyebrow text-text-2">
                  {r.keys}
                </kbd>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
