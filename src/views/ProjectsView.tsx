import { Link } from '@tanstack/react-router'
import { useStore } from '../state/store'
import { Icon } from './../components/Icon'

export function ProjectsView() {
  const { v } = useStore()
  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div className="w-[720px] max-w-full" style={{ padding: v.pagePad }}>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="font-display tracking-[-.01em]" style={{ fontSize: v.pageTitle }}>
            Dự án
          </div>
          <button
            type="button"
            onClick={v.goConv}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border-none bg-ink px-3 py-2 text-left text-ui text-bg"
          >
            <Icon n="plus" size={15} stroke={2} /> Dự án mới
          </button>
        </div>
        <div className="mb-6 text-body text-muted">Mỗi dự án có hướng dẫn và kỹ năng riêng cho Nova.</div>
        <Link
          to="/chat/$convId"
          params={{ convId: v.activeConv }}
          className="mb-2.5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-panel p-4 text-left no-underline text-text"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-border text-text-2">
              <Icon n="inbox" size={16} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-lead">
                Chung <span className="rounded-xs bg-fill px-1.5 py-0.5 text-eyebrow text-text-2">Mặc định</span>
              </div>
              <div className="mt-0.5 text-small text-muted">Cuộc trò chuyện chưa thuộc dự án nào sẽ ở đây.</div>
            </div>
          </div>
          <span className="shrink-0 font-mono text-eyebrow text-faint">31 luồng</span>
        </Link>
        {v.projects.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2.5 border-b border-border px-1 py-4"
          >
            <Link
              to="/chat/$convId"
              params={{ convId: v.activeConv }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent text-left no-underline text-text"
            >
              <span className="size-2.5 shrink-0 rounded-xs" style={{ background: p.dot }} />
              <div className="min-w-0">
                <div className="truncate text-lead">{p.name}</div>
                <div className="mt-0.5 truncate text-ui text-muted">{p.desc}</div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-right font-mono text-eyebrow leading-normal text-faint">
                {p.threads}
                <br />
                {p.when}
              </span>
              <Link
                to="/projects/$projectId"
                params={{ projectId: p.projectId }}
                aria-label={`Cấu hình ${p.name}`}
                className="flex cursor-pointer bg-transparent text-faint no-underline"
              >
                <Icon n="settings" size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
