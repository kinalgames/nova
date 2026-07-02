import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { PresetCard } from '../components/PresetCard'
import { Icon } from '../components/Icon'
import { projectAccents } from '../data/defs'
import type { PreviewKind } from '../state/types'

const BADGES: Record<PreviewKind, { cls: string; label: string }> = {
  md: { cls: 'bg-fill text-accent-text', label: 'MD' },
  pdf: { cls: 'bg-danger-bg text-danger-text', label: 'PDF' },
  csv: { cls: 'bg-success-bg text-success-text', label: 'CSV' },
  code: { cls: 'bg-info-bg text-info', label: 'CODE' },
  image: { cls: 'bg-fill text-accent-text', label: 'IMG' },
}

const FILE_ROW =
  'flex cursor-pointer items-center gap-3 rounded-md border border-border bg-panel px-3 py-3 text-left'
const FILE_BADGE =
  'flex h-[30px] w-[26px] shrink-0 items-center justify-center rounded-xs font-mono text-micro'
const SECTION_LABEL = 'font-mono text-eyebrow tracking-[.14em] text-label'

export function ProjectConfigView() {
  const { v } = useStore()
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const id = v.viewProjectId
  const readOnly = v.viewProjectIsDefault

  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div className="w-[640px] max-w-full" style={{ padding: v.pagePad }}>
        <Link
          to="/projects/$projectId"
          params={{ projectId: id }}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 bg-transparent text-left text-ui text-muted no-underline"
        >
          <Icon n="back" size={15} /> {v.viewProjectName}
        </Link>

        <div className="mb-1.5 flex items-center gap-3">
          <span className="size-3 shrink-0 rounded-xs" style={{ background: v.viewProjectAccent }} />
          <div className="font-display tracking-[-.01em]" style={{ fontSize: v.pageTitle }}>
            {t('projects.config.title')}
          </div>
        </div>
        <div className="mb-8 text-body text-muted">
          {t('projects.threads', { count: v.viewProjectCount })}
        </div>

        <div className={`${SECTION_LABEL} mb-2`}>{t('projects.config.nameLabel')}</div>
        <input
          value={v.viewProjectName}
          onChange={(e) => v.editProject(id, { name: e.target.value })}
          disabled={readOnly}
          aria-label={t('projects.config.nameAria')}
          className="field mb-2 w-full rounded-md border border-border bg-panel px-4 py-3 text-body disabled:opacity-60"
        />
        {readOnly && (
          <div className="mb-8 text-meta text-muted">{t('projects.config.readOnly')}</div>
        )}
        {!readOnly && (
          <>
            <div className={`${SECTION_LABEL} mb-2 mt-6`}>{t('projects.config.colorLabel')}</div>
            <div className="mb-8 flex items-center gap-2">
              {projectAccents.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={t('projects.config.colorAria', { color: a })}
                  aria-pressed={v.viewProjectAccent === a}
                  onClick={() => v.editProject(id, { accent: a })}
                  className={`size-6 cursor-pointer rounded-sm border-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    v.viewProjectAccent === a ? 'border-ink' : 'border-transparent'
                  }`}
                  style={{ background: a }}
                />
              ))}
            </div>
          </>
        )}

        <div className={`${SECTION_LABEL} mb-2`}>{t('projects.config.introLabel')}</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          {t('projects.config.introHelp')}
        </div>
        <textarea
          value={v.viewProjectDescription}
          onChange={(e) => v.editProject(id, { description: e.target.value })}
          rows={4}
          aria-label={t('projects.config.introAria')}
          className="field mb-8 w-full resize-none rounded-md border border-border bg-panel px-4 py-4 text-body leading-relaxed"
        />

        <div className={`${SECTION_LABEL} mb-3`}>{t('projects.config.filesLabel')}</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          {t('projects.config.filesHelp')}
        </div>
        <div className="mb-3 flex flex-col gap-2">
          {v.viewProjectFiles.map((f) => (
            <div key={f.id} className="group/file relative flex items-center">
              <button type="button" onClick={f.open} className={`${FILE_ROW} min-w-0 flex-1`}>
                <span className={`${FILE_BADGE} ${BADGES[f.kind].cls}`}>{BADGES[f.kind].label}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-ui">{f.name}</div>
                  <div className="text-meta text-muted">{f.meta}</div>
                </div>
                <Icon n="expand" size={15} className="text-faint" />
              </button>
              <button
                type="button"
                aria-label={t('projects.config.removeFile', { name: f.name })}
                onClick={f.remove}
                className="absolute -right-2 -top-2 flex cursor-pointer items-center justify-center rounded-full border border-border bg-panel p-1 text-faint opacity-0 shadow-overlay outline-none transition-opacity hover:text-danger group-hover/file:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Icon n="close" size={12} />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileInput}
          type="file"
          hidden
          aria-label={t('projects.config.uploadAria')}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) v.addViewProjectFile(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mb-8 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-transparent px-3 py-2 text-ui text-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Icon n="plus" size={14} /> {t('projects.config.upload')}
        </button>

        <div className={`${SECTION_LABEL} mb-2`}>{t('projects.config.skillsLabel')}</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          {t('projects.config.skillsHelp')}{' '}
          <span className="text-text">{t('projects.config.skillsKnows')}</span> {v.projActiveNames}
        </div>
        <div className="flex flex-col gap-2.5">
          {v.presetsProj.map((pr) => (
            <PresetCard key={pr.id} pr={pr} />
          ))}
        </div>

        {!readOnly && (
          <div className="mt-10 border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-danger-line bg-transparent px-3 py-2 text-ui text-danger outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon n="close" size={14} /> {t('projects.config.delete')}
            </button>
            <div className="mt-2 text-meta text-muted">{t('projects.config.deleteHelp')}</div>

            <Dialog.Root open={confirming} onOpenChange={setConfirming}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_120ms_ease] bg-scrim" />
                <Dialog.Content className="fixed left-1/2 top-[26%] z-[60] w-[420px] max-w-[94vw] -translate-x-1/2 animate-[fadeUp_150ms_var(--ease-paper)] rounded-lg border border-border bg-panel p-6 shadow-overlay outline-none">
                  <Dialog.Title className="font-display text-h3">
                    {t('projects.config.confirmTitle', { name: v.viewProjectName })}
                  </Dialog.Title>
                  <Dialog.Description className="mb-5 mt-1.5 text-ui leading-normal text-muted">
                    {t('projects.config.confirmBody', { count: v.viewProjectCount })}
                  </Dialog.Description>
                  <div className="flex justify-end gap-2.5">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="cursor-pointer rounded-sm border border-border bg-transparent px-3.5 py-2 text-ui text-muted"
                      >
                        {t('common.cancel')}
                      </button>
                    </Dialog.Close>
                    <button
                      type="button"
                      onClick={() => v.deleteProject(id)}
                      className="cursor-pointer rounded-sm border-none bg-danger-strong px-3.5 py-2 text-ui text-on-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        )}
      </div>
    </div>
  )
}
