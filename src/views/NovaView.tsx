import { useStore } from '../state/store'
import { css } from '../css'
import { PresetCard } from '../components/PresetCard'
import { Icon } from '../components/Icon'

export function NovaView() {
  const { v } = useStore()
  if (!v.isAssistant) return null
  return (
    <div style={css('position:absolute;inset:0;overflow-y:auto;display:flex;justify-content:center')}>
      <div style={css(`width:660px;max-width:100%;padding:${v.pagePad}`)}>
        <div style={css('display:flex;align-items:center;gap:16px;margin-bottom:28px')}>
          <div style={css('width:54px;height:54px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:var(--bg);box-shadow:inset -5px -5px 0 rgba(0,0,0,.08);flex-shrink:0')}><Icon n="nova" size={24} /></div>
          <div>
            <div style={css("font-family:var(--font-display);font-size:32px;line-height:1")}>Nova</div>
            <div style={css('font-size:14px;color:var(--muted)')}>Trợ lý của bạn · tiếng Việt</div>
          </div>
        </div>

        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:11px")}>PHONG CÁCH TRẢ LỜI</div>
        <div style={css('display:flex;gap:9px;margin-bottom:28px;flex-wrap:wrap')}>
          <div onClick={v.toggleConcise} style={css(`border:1px solid ${v.stConciseBd};background:${v.stConciseBg};color:${v.stConciseFg};border-radius:9px;padding:8px 15px;font-size:14px;cursor:pointer`)}>Ngắn gọn</div>
          <div onClick={v.toggleWarm} style={css(`border:1px solid ${v.stWarmBd};background:${v.stWarmBg};color:${v.stWarmFg};border-radius:9px;padding:8px 15px;font-size:14px;cursor:pointer`)}>Ấm áp</div>
          <div onClick={v.toggleFormal} style={css(`border:1px solid ${v.stFormalBd};background:${v.stFormalBg};color:${v.stFormalFg};border-radius:9px;padding:8px 15px;font-size:14px;cursor:pointer`)}>Trang trọng</div>
          <div onClick={v.toggleHumor} style={css(`border:1px solid ${v.stHumorBd};background:${v.stHumorBg};color:${v.stHumorFg};border-radius:9px;padding:8px 15px;font-size:14px;cursor:pointer`)}>Hài hước</div>
        </div>

        <div style={css('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px')}>
          <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint)")}>KỸ NĂNG CỦA NOVA</div>
          <span style={css('font-size:13px;color:var(--muted)')}>Bật/tắt cho mọi dự án</span>
        </div>
        <div style={css('font-size:13.5px;color:var(--muted);margin-bottom:14px;line-height:1.5')}>Mỗi kỹ năng dạy Nova cách làm một loại việc. Bạn cũng có thể bật riêng cho từng dự án.</div>
        <div style={css('display:flex;flex-direction:column;gap:10px;margin-bottom:28px')}>
          {v.presetsLib.map((pr) => (
            <PresetCard key={pr.id} pr={pr} />
          ))}
        </div>

        <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--faint);margin-bottom:9px")}>HƯỚNG DẪN HỆ THỐNG</div>
        <div style={css('font-size:13.5px;color:var(--muted);margin-bottom:11px;line-height:1.5')}>Cách Nova trả lời trong mọi cuộc trò chuyện. Bạn có thể chỉnh tự do bất cứ lúc nào.</div>
        <div style={css('border:1px solid var(--border);border-radius:12px;padding:15px 16px;font-size:15px;line-height:1.75;background:var(--panel);color:var(--text)')}>
          Trả lời ngắn gọn, đi thẳng vấn đề. Ưu tiên gạch đầu dòng. Giọng tự tin nhưng không phô trương. Hỏi lại khi yêu cầu mơ hồ thay vì đoán.
          <span style={css('color:var(--accent);animation:caret 1.1s steps(1) infinite')}>|</span>
        </div>
      </div>
    </div>
  )
}
