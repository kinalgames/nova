import { Link } from '@tanstack/react-router'
import { useStore } from '../state/store'
import { PresetCard } from '../components/PresetCard'
import { Icon } from '../components/Icon'

const FILE_ROW =
  'flex cursor-pointer items-center gap-3 rounded-md border border-border bg-panel px-3 py-3 text-left'
const FILE_BADGE = 'flex h-[30px] w-[26px] shrink-0 items-center justify-center rounded-xs font-mono text-micro'
const SECTION_LABEL = 'font-mono text-micro tracking-[.14em] text-faint'

export function ProjectConfigView() {
  const { v } = useStore()
  return (
    <div className="view absolute inset-0 flex justify-center overflow-y-auto">
      <div className="w-[640px] max-w-full" style={{ padding: v.pagePad }}>
        <Link
          to="/projects"
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 bg-transparent text-left text-ui text-muted no-underline"
        >
          <Icon n="back" size={15} /> Tất cả dự án
        </Link>
        <div className="mb-1.5 flex items-center gap-3">
          <span className="size-3 rounded-xs bg-accent" />
          <div className="font-display tracking-[-.01em]" style={{ fontSize: v.pageTitle }}>
            Aurora
          </div>
          <span className="rounded-xs bg-accent-soft px-2 py-0.5 text-eyebrow text-accent-text">Đang mở</span>
        </div>
        <div className="mb-8 text-body text-muted">Ra mắt sản phẩm · 12 luồng</div>

        <div className={`${SECTION_LABEL} mb-2`}>GIỚI THIỆU DỰ ÁN</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          Nói cho Nova biết dự án này về điều gì. Nova nhớ trong mọi cuộc trò chuyện ở đây.
        </div>
        <div className="mb-8 min-h-[92px] rounded-md border border-border bg-panel px-4 py-4 text-body leading-relaxed">
          Ra mắt Aurora vào Q3. Đối tượng là người làm việc sâu, ghét phân tâm. Giọng tự tin, không phô trương. Luôn tham chiếu tài liệu Định-vị-v2.md khi nói về thông điệp.
          <span className="text-accent-text animate-[caret_1.1s_steps(1)_infinite]">|</span>
        </div>

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
          <button type="button" onClick={v.openLightbox} className={FILE_ROW}>
            <span className="h-[30px] w-[26px] shrink-0 rounded-xs bg-[linear-gradient(135deg,#E7C9A8,#7E6E92)]" />
            <div className="min-w-0 flex-1">
              <div className="text-ui">moodboard.png</div>
              <div className="text-meta text-muted">820 KB · 1440×960</div>
            </div>
            <Icon n="expand" size={15} className="text-faint" />
          </button>
        </div>

        <div className={`${SECTION_LABEL} mb-2`}>KỸ NĂNG CHO DỰ ÁN NÀY</div>
        <div className="mb-3 text-ui leading-normal text-muted">
          Bật kỹ năng để Nova giỏi hơn ở dự án này. <span className="text-text">Nova ở đây biết:</span> {v.projActiveNames}
        </div>
        <div className="flex flex-col gap-2.5">
          {v.presetsProj.map((pr) => (
            <PresetCard key={pr.id} pr={pr} />
          ))}
        </div>
      </div>
    </div>
  )
}
