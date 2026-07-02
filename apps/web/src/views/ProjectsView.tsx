import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './../components/Icon'
import { NewProjectDialog } from '../components/NewProjectDialog'

export function ProjectsView() {
  const { v } = useStore()
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div className="w-[720px] max-w-full" style={{ padding: v.pagePad }}>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="font-display tracking-[-.01em]" style={{ fontSize: v.pageTitle }}>
            {t('projects.title')}
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border-none bg-ink px-3 py-2 text-left text-ui text-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon n="plus" size={15} stroke={2} /> {t('projects.new')}
          </button>
        </div>
        <div className="mb-6 text-body text-muted">{t('projects.subtitle')}</div>

        {v.projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-2.5 border-b border-border px-1 py-4"
          >
            <Link
              to="/projects/$projectId"
              params={{ projectId: p.id }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent text-left text-text no-underline"
            >
              <span className="size-2.5 shrink-0 rounded-xs" style={{ background: p.dot }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-lead">
                  <span className="truncate">{p.name}</span>
                  {p.isDefault && (
                    <span className="shrink-0 rounded-xs bg-fill px-1.5 py-0.5 text-eyebrow text-text-2">
                      {t('projects.defaultBadge')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-ui text-muted">{p.description}</div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-eyebrow text-faint">
                {t('projects.threads', { count: p.count })}
              </span>
              <Link
                to="/projects/$projectId/config"
                params={{ projectId: p.id }}
                aria-label={t('projects.configAria', { name: p.name })}
                className="flex cursor-pointer bg-transparent text-faint no-underline"
              >
                <Icon n="settings" size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <NewProjectDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
