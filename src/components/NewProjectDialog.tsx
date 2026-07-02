import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { projectAccents } from '../data/defs'

const FIELD = 'field w-full rounded-md border border-border bg-bg px-3 py-2.5 text-body'
const LABEL = 'mb-1.5 block font-mono text-eyebrow tracking-[.14em] text-label'

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { v } = useStore()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accent, setAccent] = useState(projectAccents[0])

  const close = (o: boolean) => {
    if (!o) {
      setName('')
      setDescription('')
      setAccent(projectAccents[0])
    }
    onOpenChange(o)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    v.createProject(n, description.trim(), accent)
    close(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_120ms_ease] bg-[rgba(27,26,22,0.28)]" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-[60] w-[460px] max-w-[94vw] -translate-x-1/2 animate-[fadeUp_150ms_var(--ease-paper)] rounded-lg border border-border bg-panel p-6 shadow-overlay outline-none">
          <Dialog.Title className="font-display text-h3">{t('newProject.title')}</Dialog.Title>
          <Dialog.Description className="mb-5 mt-1 text-ui text-muted">
            {t('newProject.body')}
          </Dialog.Description>
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div>
              <label htmlFor="np-name" className={LABEL}>
                {t('newProject.nameLabel')}
              </label>
              <input
                id="np-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('newProject.namePlaceholder')}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="np-desc" className={LABEL}>
                {t('newProject.descLabel')}
              </label>
              <textarea
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t('newProject.descPlaceholder')}
                className={`${FIELD} resize-none leading-normal`}
              />
            </div>
            <div>
              <span className={LABEL}>{t('newProject.colorLabel')}</span>
              <div className="flex items-center gap-2">
                {projectAccents.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-label={t('newProject.colorAria', { color: a })}
                    aria-pressed={accent === a}
                    onClick={() => setAccent(a)}
                    className={`size-6 cursor-pointer rounded-sm border-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      accent === a ? 'border-ink' : 'border-transparent'
                    }`}
                    style={{ background: a }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2.5">
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
                disabled={!name.trim()}
                className="cursor-pointer rounded-sm border-none bg-ink px-3.5 py-2 text-ui text-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-[.38]"
              >
                {t('newProject.submit')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
