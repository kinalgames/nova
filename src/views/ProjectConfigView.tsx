import { useStore } from '../state/store'
import { css } from '../css'
import { PresetCard } from '../components/PresetCard'
import { Icon } from '../components/Icon'

export function ProjectConfigView() {
  const { v } = useStore()
  if (!v.isProjectCfg) return null
  return (
    <div style={css('position:absolute;inset:0;overflow-y:auto;display:flex;justify-content:center')}>
      <div style={css(`width:640px;max-width:100%;padding:${v.pagePad}`)}>
        <div onClick={v.goProjects} style={css('display:inline-flex;align-items:center;gap:6px;font-size:13.5px;color:var(--muted);cursor:pointer;margin-bottom:14px')}><Icon n="back" size={15} /> Tất cả dự án</div>
        <div style={css('display:flex;align-items:center;gap:12px;margin-bottom:6px')}>
          <span style={css('width:12px;height:12px;border-radius:4px;background:var(--accent)')} />
          <div style={css(`font-family:var(--font-display);font-size:${v.pageTitle};letter-spacing:-.01em`)}>Aurora</div>
          <span style={css('font-size:11px;color:var(--accent);background:var(--accent-soft);border-radius:6px;padding:3px 9px')}>Đang mở</span>
        </div>
        <div style={css('font-size:15px;color:var(--muted);margin-bottom:30px')}>Ra mắt sản phẩm · 12 luồng</div>

        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:9px")}>GIỚI THIỆU DỰ ÁN</div>
        <div style={css('font-size:13.5px;color:var(--muted);margin-bottom:11px;line-height:1.5')}>Nói cho Nova biết dự án này về điều gì. Nova nhớ trong mọi cuộc trò chuyện ở đây.</div>
        <div style={css('border:1px solid var(--border);border-radius:12px;padding:15px 16px;font-size:15.5px;line-height:1.7;background:var(--panel);margin-bottom:30px;min-height:92px')}>
          Ra mắt Aurora vào Q3. Đối tượng là người làm việc sâu, ghét phân tâm. Giọng tự tin, không phô trương. Luôn tham chiếu tài liệu Định-vị-v2.md khi nói về thông điệp.
          <span style={css('color:var(--accent);animation:caret 1.1s steps(1) infinite')}>|</span>
        </div>

        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:11px")}>TỆP DỰ ÁN</div>
        <div style={css('font-size:13.5px;color:var(--muted);margin-bottom:14px;line-height:1.5')}>Mọi tệp đã tải lên trong dự án. Nova đọc khi bạn cho phép.</div>
        <div style={css('display:flex;flex-direction:column;gap:8px;margin-bottom:30px')}>
          <div onClick={v.openMd} style={css('display:flex;align-items:center;gap:11px;border:1px solid var(--border);border-radius:11px;background:var(--panel);padding:11px 13px;cursor:pointer')}>
            <span style={css("width:26px;height:30px;border-radius:5px;background:var(--fill);color:var(--accent);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>MD</span>
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:14px')}>plan.md</div>
              <div style={css('font-size:11.5px;color:var(--muted)')}>2.1 KB · vừa cập nhật</div>
            </div>
            <Icon n="expand" size={15} style={{ color: 'var(--faint)' }} />
          </div>
          <div onClick={v.openPdf} style={css('display:flex;align-items:center;gap:11px;border:1px solid var(--border);border-radius:11px;background:var(--panel);padding:11px 13px;cursor:pointer')}>
            <span style={css("width:26px;height:30px;border-radius:5px;background:var(--danger-bg);color:var(--danger-strong);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>PDF</span>
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:14px')}>Brief-Aurora.pdf</div>
              <div style={css('font-size:11.5px;color:var(--muted)')}>1.2 MB · 8 trang</div>
            </div>
            <Icon n="expand" size={15} style={{ color: 'var(--faint)' }} />
          </div>
          <div onClick={v.openCsv} style={css('display:flex;align-items:center;gap:11px;border:1px solid var(--border);border-radius:11px;background:var(--panel);padding:11px 13px;cursor:pointer')}>
            <span style={css("width:26px;height:30px;border-radius:5px;background:var(--success-bg);color:var(--success);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>CSV</span>
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:14px')}>Khảo-sát.csv</div>
              <div style={css('font-size:11.5px;color:var(--muted)')}>18 KB · 412 dòng</div>
            </div>
            <Icon n="expand" size={15} style={{ color: 'var(--faint)' }} />
          </div>
          <div onClick={v.openLightbox} style={css('display:flex;align-items:center;gap:11px;border:1px solid var(--border);border-radius:11px;background:var(--panel);padding:11px 13px;cursor:pointer')}>
            <span style={css('width:26px;height:30px;border-radius:5px;background:linear-gradient(135deg,#E7C9A8,#7E6E92);flex-shrink:0')} />
            <div style={css('flex:1;min-width:0')}>
              <div style={css('font-size:14px')}>moodboard.png</div>
              <div style={css('font-size:11.5px;color:var(--muted)')}>820 KB · 1440×960</div>
            </div>
            <Icon n="expand" size={15} style={{ color: 'var(--faint)' }} />
          </div>
        </div>

        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:9px")}>KỸ NĂNG CHO DỰ ÁN NÀY</div>
        <div style={css('font-size:13.5px;color:var(--muted);margin-bottom:14px;line-height:1.5')}>
          Bật kỹ năng để Nova giỏi hơn ở dự án này. <span style={css('color:var(--text)')}>Nova ở đây biết:</span> {v.projActiveNames}
        </div>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          {v.presetsProj.map((pr) => (
            <PresetCard key={pr.id} pr={pr} />
          ))}
        </div>
      </div>
    </div>
  )
}
