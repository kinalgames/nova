import { Link } from '@tanstack/react-router'
import { useStore } from '../state/store'
import { PresetCard } from '../components/PresetCard'
import { Icon } from '../components/Icon'

const FILE_ROW =
  'flex cursor-pointer items-center gap-3 rounded-md border border-border bg-panel px-3 py-3 text-left'
const FILE_BADGE =
  'flex h-[30px] w-[26px] shrink-0 items-center justify-center rounded-xs font-mono text-micro'
const SECTION_LABEL = 'font-mono text-eyebrow tracking-[.14em] text-label'

export function ProjectConfigView() {
  const { v } = useStore()
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
            Cấu hình dự án
          </div>
        </div>
        <div className="mb-8 text-body text-muted">{v.viewProjectCount} luồng</div>

        <div className={`${SECTION_LABEL} mb-2`}>TÊN DỰ ÁN</div>
        <input
          value={v.viewProjectName}
          onChange={(e) => v.editProject(id, { name: e.target.value })}
          disabled={readOnly}
          aria-label="Tên dự án"
          className="field mb-2 w-full rounded-md border border-border bg-panel px-4 py-3 text-body disabled:opacity-60"
        />
        {readOnly && (
          <div className="mb-8 text-meta text-muted">Dự án mặc định — không đổi tên hay xóa.</div>
        )}
        {!readOnly && <div className="mb-8" />}

        <div className={`${SECTION_LABEL} mb-2`}>GIỚI THIỆU DỰ ÁN</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          Nói cho Nova biết dự án này về điều gì. Nova nhớ trong mọi cuộc trò chuyện ở đây.
        </div>
        <textarea
          value={v.viewProjectDescription}
          onChange={(e) => v.editProject(id, { description: e.target.value })}
          rows={4}
          aria-label="Giới thiệu dự án"
          className="field mb-8 w-full resize-none rounded-md border border-border bg-panel px-4 py-4 text-body leading-relaxed"
        />

        <div className={`${SECTION_LABEL} mb-3`}>TỆP DỰ ÁN</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          Mọi tệp đã tải lên trong dự án. Nova đọc khi bạn cho phép.
        </div>
        <div className="mb-8 flex flex-col gap-2">
          <button type="button" onClick={v.openMd} className={FILE_ROW}>
            <span className={`${FILE_BADGE} bg-fill text-accent-text`}>MD</span>
            <div className="min-w-0 flex-1">
              <div className="text-ui">plan.md</div>
              <div className="text-meta text-muted">2.1 KB · vừa cập nhật</div>
            </div>
            <Icon n="expand" size={15} className="text-faint" />
          </button>
          <button type="button" onClick={v.openPdf} className={FILE_ROW}>
            <span className={`${FILE_BADGE} bg-danger-bg text-danger-text`}>PDF</span>
            <div className="min-w-0 flex-1">
              <div className="text-ui">Brief-Aurora.pdf</div>
              <div className="text-meta text-muted">1.2 MB · 8 trang</div>
            </div>
            <Icon n="expand" size={15} className="text-faint" />
          </button>
          <button type="button" onClick={v.openCsv} className={FILE_ROW}>
            <span className={`${FILE_BADGE} bg-success-bg text-success-text`}>CSV</span>
            <div className="min-w-0 flex-1">
              <div className="text-ui">Khảo-sát.csv</div>
              <div className="text-meta text-muted">18 KB · 412 dòng</div>
            </div>
            <Icon n="expand" size={15} className="text-faint" />
          </button>
        </div>

        <div className={`${SECTION_LABEL} mb-2`}>KỸ NĂNG CHO DỰ ÁN NÀY</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          Bật kỹ năng để Nova giỏi hơn ở dự án này.{' '}
          <span className="text-text">Nova ở đây biết:</span> {v.projActiveNames}
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
              onClick={() => {
                if (
                  typeof window === 'undefined' ||
                  !window.confirm ||
                  window.confirm(`Xóa dự án "${v.viewProjectName}"? Cuộc trò chuyện sẽ chuyển về Chung.`)
                ) {
                  v.deleteProject(id)
                }
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-danger-line bg-transparent px-3 py-2 text-ui text-danger outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon n="close" size={14} /> Xóa dự án
            </button>
            <div className="mt-2 text-meta text-muted">
              Cuộc trò chuyện trong dự án sẽ được chuyển về dự án Chung, không bị mất.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
