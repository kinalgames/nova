import { useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'

/** Paper-style rename for a conversation (replaces window.prompt). */
export function RenameDialog() {
  const { v } = useStore()
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const open = v.renamingConv !== null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    v.saveRename(input.current?.value ?? '')
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && v.closeRename()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_120ms_ease] bg-[rgba(27,26,22,0.28)]" />
        <Dialog.Content className="fixed left-1/2 top-[24%] z-[60] w-[420px] max-w-[94vw] -translate-x-1/2 animate-[fadeUp_150ms_var(--ease-paper)] rounded-lg border border-border bg-panel p-6 shadow-overlay outline-none">
          <Dialog.Title className="font-display text-h3">{t('renameDialog.title')}</Dialog.Title>
          <Dialog.Description className="mb-4 mt-1 text-ui text-muted">
            {t('renameDialog.body')}
          </Dialog.Description>
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <input
              ref={input}
              key={v.renamingConv ?? 'closed'}
              defaultValue={v.renameTitle}
              aria-label={t('renameDialog.inputAria')}
              className="field w-full rounded-md border border-border bg-bg px-3 py-2.5 text-body"
            />
            <div className="mt-1 flex justify-end gap-2.5">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-sm border border-border bg-transparent px-3.5 py-2 text-ui text-muted"
                >
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="cursor-pointer rounded-sm border-none bg-ink px-3.5 py-2 text-ui text-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
