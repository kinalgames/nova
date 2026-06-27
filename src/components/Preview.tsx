import * as Dialog from '@radix-ui/react-dialog'
import { useStore } from '../state/store'
import { css } from '../css'
import { Icon } from './Icon'

export function Preview() {
  const { v } = useStore()
  return (
    <Dialog.Root
      open={v.hasPreview}
      onOpenChange={(o) => {
        if (!o) v.closePreview()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_140ms_ease] bg-[rgba(20,18,15,0.82)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] flex flex-col outline-none"
        >
          <div className="flex h-14 flex-shrink-0 items-center justify-between px-[18px] text-[#ece7dd]">
            <Dialog.Title className="text-[14px] font-normal">
              {v.previewName} <span className="text-[12px] text-[#9c958a]">· {v.previewMeta}</span>
            </Dialog.Title>
            <div className="flex items-center gap-4 text-[13px]">
              <button
                type="button"
                onClick={v.downloadPreview}
                className="inline-flex cursor-pointer items-center gap-[5px] border-none bg-transparent text-inherit"
              >
                <Icon n="download" size={14} /> Tải
              </button>
              <button
                type="button"
                onClick={v.openPreviewExternal}
                className="inline-flex cursor-pointer items-center gap-[5px] border-none bg-transparent text-inherit"
              >
                <Icon n="open" size={14} /> Mở
              </button>
              <Dialog.Close asChild>
                <button type="button" aria-label="Đóng" className="flex cursor-pointer border-none bg-transparent text-inherit outline-none">
                  <Icon n="close" size={16} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div style={css('flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:0 20px 30px')}>
        {v.isPrevImage &&
          (v.previewUrl ? (
            <img
              src={v.previewUrl}
              alt={v.previewName}
              style={css('max-width:min(820px,90vw);max-height:70vh;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.5);animation:pop .18s ease;object-fit:contain')}
            />
          ) : (
            <div style={css('width:min(820px,90vw);height:min(560px,70vh);border-radius:14px;background:linear-gradient(135deg,#E7C9A8,#C98F86 55%,#7E6E92);box-shadow:0 30px 80px rgba(0,0,0,.5);animation:pop .18s ease')} />
          ))}

        {v.isPrevPdf && (
          <div className="paper-doc" style={css('position:relative;width:min(540px,92vw);height:min(640px,78vh);background:#fff;border-radius:8px;box-shadow:0 30px 80px rgba(0,0,0,.5);padding:46px 48px;overflow:hidden;animation:pop .18s ease')}>
            <div style={css("font-family:var(--font-display);font-size:32px;margin-bottom:4px;color:var(--text)")}>Aurora — Brief</div>
            <div style={css('font-size:12px;color:var(--muted);margin-bottom:26px')}>Ra mắt sản phẩm · Q3 2026</div>
            <div style={css('font-size:14px;line-height:1.85;color:var(--text)')}>
              Aurora là không gian làm việc AI một luồng, dành cho người làm việc sâu — gom mọi cuộc trò chuyện, tài liệu và công cụ vào một nơi tập trung.
            </div>
            <div style={css('margin-top:22px;height:9px;width:92%;background:var(--border);border-radius:4px')} />
            <div style={css('margin-top:11px;height:9px;width:84%;background:var(--border);border-radius:4px')} />
            <div style={css('margin-top:11px;height:9px;width:88%;background:var(--border);border-radius:4px')} />
            <div style={css('margin-top:11px;height:9px;width:58%;background:var(--border);border-radius:4px')} />
            <div style={css("position:absolute;bottom:18px;left:0;right:0;text-align:center;font-family:var(--font-mono);font-size:11px;color:var(--faint)")}>trang 1 / 8</div>
          </div>
        )}

        {v.isPrevCode && (
          <div style={css('width:min(680px,92vw);background:var(--code-bg);border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden;animation:pop .18s ease')}>
            <div style={css("height:34px;display:flex;align-items:center;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.07);font-family:var(--font-mono);font-size:11px;color:var(--code-dim)")}>analyze.py</div>
            <div style={css("padding:16px 18px;font-family:var(--font-mono);font-size:13px;line-height:1.95;color:var(--code-fg)")}>
              <div><span style={css('color:var(--code-dim)')}>1&nbsp;&nbsp;</span><span style={css('color:#C98FB0')}>import</span> pandas <span style={css('color:#C98FB0')}>as</span> pd</div>
              <div><span style={css('color:var(--code-dim)')}>2&nbsp;&nbsp;</span></div>
              <div><span style={css('color:var(--code-dim)')}>3&nbsp;&nbsp;</span>survey = pd.read_csv(<span style={css('color:#9FBF9F')}>"survey.csv"</span>)</div>
              <div><span style={css('color:var(--code-dim)')}>4&nbsp;&nbsp;</span>bench&nbsp;&nbsp;= pd.read_json(<span style={css('color:#9FBF9F')}>"bench.json"</span>)</div>
              <div><span style={css('color:var(--code-dim)')}>5&nbsp;&nbsp;</span>act = survey[<span style={css('color:#9FBF9F')}>"activated_72h"</span>].mean()</div>
              <div><span style={css('color:var(--code-dim)')}>6&nbsp;&nbsp;</span><span style={css('color:#C98FB0')}>print</span>(<span style={css('color:#9FBF9F')}>f"kích hoạt: {'{act:.0%}'}"</span>)</div>
            </div>
          </div>
        )}

        {v.isPrevCsv && (
          <div className="paper-doc" style={css("width:min(620px,92vw);max-height:78vh;overflow:auto;background:#fff;border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.5);animation:pop .18s ease;font-family:var(--font-mono);font-size:12.5px;color:var(--text)")}>
            <div style={css('display:grid;grid-template-columns:1.4fr 1fr 1fr')}>
              <div style={css('padding:11px 14px;background:var(--side);color:var(--text-2)')}>người dùng</div>
              <div style={css('padding:11px 14px;background:var(--side);color:var(--text-2)')}>kích hoạt 72h</div>
              <div style={css('padding:11px 14px;background:var(--side);color:var(--text-2)')}>kênh</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border)')}>u_0142</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border);color:var(--success)')}>có</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border)')}>email</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border)')}>u_0143</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border);color:var(--danger)')}>không</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border)')}>ads</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border)')}>u_0144</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border);color:var(--success)')}>có</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border)')}>giới thiệu</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border);color:var(--faint)')}>…</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border);color:var(--faint)')}>…</div>
              <div style={css('padding:11px 14px;border-top:1px solid var(--border);color:var(--faint)')}>…</div>
            </div>
          </div>
        )}

        {v.isPrevMd && (
          <div className="paper-doc" style={css('width:min(620px,92vw);max-height:78vh;overflow:auto;background:#fff;border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.5);padding:36px 40px;animation:pop .18s ease;color:var(--text)')}>
            <div style={css("font-family:var(--font-display);font-size:30px;margin-bottom:16px")}>Kế hoạch ra mắt Aurora</div>
            <div style={css('font-size:15px;font-weight:600;margin-bottom:9px')}>Khoảng cách kích hoạt</div>
            <div style={css('font-size:14.5px;line-height:1.7;color:var(--text);display:flex;flex-direction:column;gap:7px')}>
              <div>•&nbsp;&nbsp;Kích hoạt 72 giờ: <b style={css('font-weight:600')}>29%</b> (mục tiêu 38%)</div>
              <div>•&nbsp;&nbsp;Nguyên nhân: đăng ký nhiều bước</div>
              <div>•&nbsp;&nbsp;Hành động: gộp còn một bước trước ra mắt</div>
            </div>
            <div style={css('font-size:15px;font-weight:600;margin:20px 0 9px')}>Sáu tuần</div>
            <div style={css('font-size:14.5px;line-height:1.7;color:var(--text)')}>Định vị → Sản xuất → Ra mắt &amp; đo lường.</div>
          </div>
        )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
