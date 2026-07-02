import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { Icon } from './Icon'

const POP = 'shadow-[0_30px_80px_rgba(0,0,0,.5)] animate-[pop_.18s_ease]'
const CSV_CELL = 'border-t border-border px-3 py-3'

export function Preview() {
  const { v } = useStore()
  const { t } = useTranslation()
  return (
    <Dialog.Root
      open={v.hasPreview}
      onOpenChange={(o) => {
        if (!o) v.closePreview()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_140ms_ease] bg-scrim-lightbox" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] flex flex-col outline-none"
        >
          <div className="flex h-14 flex-shrink-0 items-center justify-between px-4 text-code-fg">
            <Dialog.Title className="text-ui font-normal">
              {v.previewName} <span className="text-meta text-code-dim">· {v.previewMeta}</span>
            </Dialog.Title>
            <div className="flex items-center gap-4 text-small">
              <button
                type="button"
                onClick={v.downloadPreview}
                className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-inherit"
              >
                <Icon n="download" size={14} /> {t('preview.download')}
              </button>
              <button
                type="button"
                onClick={v.openPreviewExternal}
                className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-inherit"
              >
                <Icon n="open" size={14} /> {t('preview.open')}
              </button>
              <Dialog.Close asChild>
                <button type="button" aria-label={t('common.close')} className="flex cursor-pointer border-none bg-transparent text-inherit outline-none">
                  <Icon n="close" size={16} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          {/* clicking the dark backdrop (not the media) closes; keyboard users use Esc */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) v.closePreview()
            }}
            className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-5 pb-8"
          >
            {v.isPrevImage &&
              (v.previewUrl ? (
                <img
                  src={v.previewUrl}
                  alt={v.previewName}
                  className={`max-h-[70vh] max-w-[min(820px,90vw)] rounded-md object-contain ${POP}`}
                />
              ) : (
                <div
                  className={`h-[min(560px,70vh)] w-[min(820px,90vw)] rounded-md bg-[linear-gradient(135deg,#E7C9A8,#C98F86_55%,#7E6E92)] ${POP}`}
                />
              ))}

            {v.isPrevPdf && (
              <div
                className={`paper-doc relative h-[min(640px,78vh)] w-[min(540px,92vw)] overflow-hidden rounded-sm bg-white px-12 py-12 ${POP}`}
              >
                <div className="mb-1 font-display text-h2 text-text">Aurora — Brief</div>
                <div className="mb-6 text-meta text-muted">Ra mắt sản phẩm · Q3 2026</div>
                <div className="text-ui leading-relaxed text-text">
                  Aurora là không gian làm việc AI một luồng, dành cho người làm việc sâu — gom mọi cuộc trò chuyện, tài liệu và công cụ vào một nơi tập trung.
                </div>
                <div className="mt-5 h-[9px] w-[92%] rounded-xs bg-border" />
                <div className="mt-3 h-[9px] w-[84%] rounded-xs bg-border" />
                <div className="mt-3 h-[9px] w-[88%] rounded-xs bg-border" />
                <div className="mt-3 h-[9px] w-[58%] rounded-xs bg-border" />
                <div className="absolute inset-x-0 bottom-[18px] text-center font-mono text-eyebrow text-faint">trang 1 / 8</div>
              </div>
            )}

            {v.isPrevCode && (
              <div className={`w-[min(680px,92vw)] overflow-hidden rounded-sm bg-code-bg ${POP}`}>
                <div className="flex h-[34px] items-center border-b border-b-[rgba(255,255,255,.07)] px-3 font-mono text-eyebrow text-code-dim">
                  analyze.py
                </div>
                <div className="px-4 py-4 font-mono text-small leading-relaxed text-code-fg">
                  <div><span className="text-code-dim">1&nbsp;&nbsp;</span><span className="text-[#C98FB0]">import</span> pandas <span className="text-[#C98FB0]">as</span> pd</div>
                  <div><span className="text-code-dim">2&nbsp;&nbsp;</span></div>
                  <div><span className="text-code-dim">3&nbsp;&nbsp;</span>survey = pd.read_csv(<span className="text-[#9FBF9F]">"survey.csv"</span>)</div>
                  <div><span className="text-code-dim">4&nbsp;&nbsp;</span>bench&nbsp;&nbsp;= pd.read_json(<span className="text-[#9FBF9F]">"bench.json"</span>)</div>
                  <div><span className="text-code-dim">5&nbsp;&nbsp;</span>act = survey[<span className="text-[#9FBF9F]">"activated_72h"</span>].mean()</div>
                  <div><span className="text-code-dim">6&nbsp;&nbsp;</span><span className="text-[#C98FB0]">print</span>(<span className="text-[#9FBF9F]">f"kích hoạt: {'{act:.0%}'}"</span>)</div>
                </div>
              </div>
            )}

            {v.isPrevCsv && (
              <div
                className={`paper-doc max-h-[78vh] w-[min(620px,92vw)] overflow-auto rounded-sm bg-white font-mono text-small text-text ${POP}`}
              >
                <div className="grid grid-cols-[1.4fr_1fr_1fr]">
                  <div className="bg-side px-3 py-3 text-text-2">người dùng</div>
                  <div className="bg-side px-3 py-3 text-text-2">kích hoạt 72h</div>
                  <div className="bg-side px-3 py-3 text-text-2">kênh</div>
                  <div className={CSV_CELL}>u_0142</div>
                  <div className={`${CSV_CELL} text-success-text`}>có</div>
                  <div className={CSV_CELL}>email</div>
                  <div className={CSV_CELL}>u_0143</div>
                  <div className={`${CSV_CELL} text-danger-text`}>không</div>
                  <div className={CSV_CELL}>ads</div>
                  <div className={CSV_CELL}>u_0144</div>
                  <div className={`${CSV_CELL} text-success-text`}>có</div>
                  <div className={CSV_CELL}>giới thiệu</div>
                  <div className={`${CSV_CELL} text-faint`}>…</div>
                  <div className={`${CSV_CELL} text-faint`}>…</div>
                  <div className={`${CSV_CELL} text-faint`}>…</div>
                </div>
              </div>
            )}

            {v.isPrevMd && (
              <div
                className={`paper-doc max-h-[78vh] w-[min(620px,92vw)] overflow-auto rounded-sm bg-white px-10 py-9 text-text ${POP}`}
              >
                <div className="mb-4 font-display text-h2">Kế hoạch ra mắt Aurora</div>
                <div className="mb-2 text-body font-semibold">Khoảng cách kích hoạt</div>
                <div className="flex flex-col gap-1.5 text-body leading-relaxed text-text">
                  <div>•&nbsp;&nbsp;Kích hoạt 72 giờ: <b className="font-semibold">29%</b> (mục tiêu 38%)</div>
                  <div>•&nbsp;&nbsp;Nguyên nhân: đăng ký nhiều bước</div>
                  <div>•&nbsp;&nbsp;Hành động: gộp còn một bước trước ra mắt</div>
                </div>
                <div className="mb-2 mt-5 text-body font-semibold">Sáu tuần</div>
                <div className="text-body leading-relaxed text-text">Định vị → Sản xuất → Ra mắt &amp; đo lường.</div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
