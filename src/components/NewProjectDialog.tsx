import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useStore } from '../state/store'

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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const close = (o: boolean) => {
    if (!o) {
      setName('')
      setDescription('')
    }
    onOpenChange(o)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    v.createProject(n, description.trim())
    close(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_120ms_ease] bg-[rgba(27,26,22,0.28)]" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-[60] w-[460px] max-w-[94vw] -translate-x-1/2 animate-[fadeUp_150ms_var(--ease-paper)] rounded-lg border border-border bg-panel p-6 shadow-overlay outline-none">
          <Dialog.Title className="font-display text-h3">Dự án mới</Dialog.Title>
          <Dialog.Description className="mb-5 mt-1 text-ui text-muted">
            Đặt tên và mô tả để Nova hiểu bối cảnh của dự án.
          </Dialog.Description>
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div>
              <label htmlFor="np-name" className={LABEL}>
                TÊN DỰ ÁN
              </label>
              <input
                id="np-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Aurora"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="np-desc" className={LABEL}>
                MÔ TẢ
              </label>
              <textarea
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Dự án này về điều gì? Nova nhớ trong mọi cuộc trò chuyện ở đây."
                className={`${FIELD} resize-none leading-normal`}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2.5">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-sm border border-border bg-transparent px-3.5 py-2 text-ui text-muted"
                >
                  Hủy
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!name.trim()}
                className="cursor-pointer rounded-sm border-none bg-ink px-3.5 py-2 text-ui text-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-[.38]"
              >
                Tạo dự án
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
