import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from '../components/Icon'
import { BTN_PRIMARY } from '../components/ui'

export function ProjectView() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div className="w-[720px] max-w-full p-[28px_18px_40px] desktop:p-[44px_16px_50px]">
        <Link
          to="/projects"
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 bg-transparent text-left text-ui text-muted no-underline"
        >
          <Icon n="back" size={15} /> {t('projects.view.back')}
        </Link>

        <div className="mb-1.5 flex items-center gap-3">
          <span className="size-3 shrink-0 rounded-xs" style={{ background: v.viewProjectAccent }} />
          <div className="text-[34px] desktop:text-[44px] font-display tracking-[-.01em]">
            {v.viewProjectName}
          </div>
          {v.viewProjectIsDefault && (
            <span className="rounded-xs bg-fill px-2 py-0.5 text-eyebrow text-text-2">
              {t('projects.defaultBadge')}
            </span>
          )}
        </div>
        {v.viewProjectDescription && (
          <div className="mb-6 max-w-[60ch] text-body leading-normal text-muted">
            {v.viewProjectDescription}
          </div>
        )}

        <div className="mb-7 mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => v.newChatInProject(v.viewProjectId)}
            className={`${BTN_PRIMARY} shrink-0`}
          >
            <Icon n="plus" size={15} stroke={2} /> {t('projects.view.newChatHere')}
          </button>
          <Link
            to="/projects/$projectId/config"
            params={{ projectId: v.viewProjectId }}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-panel px-3 py-2 text-left text-ui text-text-2 no-underline"
          >
            <Icon n="settings" size={15} /> {t('projects.view.config')}
          </Link>
        </div>

        <div className="mb-2.5 font-mono text-eyebrow tracking-[.14em] text-label">
          {t('projects.view.convCount', { count: v.viewProjectCount })}
        </div>

        {v.viewProjectConvs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-body text-muted">
            {t('projects.view.empty')}
          </div>
        ) : (
          <div className="flex flex-col">
            {v.viewProjectConvs.map((c) => (
              <Link
                key={c.id}
                to="/chat/$convId"
                params={{ convId: c.id }}
                onClick={c.onSelect}
                className="flex items-center gap-3 border-b border-border px-1 py-3.5 text-text no-underline hover:bg-hover-1"
              >
                <span className="min-w-0 flex-1 truncate text-lead">{c.title}</span>
                {c.pinned && (
                  <Icon n="pin" size={13} fill="currentColor" className="shrink-0 text-faint" />
                )}
                <Icon n="caret" size={12} className="shrink-0 -rotate-90 text-faint" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
