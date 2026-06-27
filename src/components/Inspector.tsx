import { css } from '../css'
import { Icon } from './Icon'

interface InspectorProps {
  advanced: boolean
  tokenPct: string
  tokenLabel: string
  onClose: () => void
}

export function Inspector({ advanced, tokenPct, tokenLabel, onClose }: InspectorProps) {
  const simpleMode = !advanced
  return (
    <div style={css("font-family:var(--font-body)")}>
      <div style={css('height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid var(--border-2)')}>
        <span style={css("font-family:var(--font-display);font-size:18px;color:var(--text)")}>Ngữ cảnh</span>
        <span onClick={onClose} style={css('cursor:pointer;color:var(--faint);display:flex')}><Icon n="close" size={16} /></span>
      </div>
      <div style={css('padding:18px;display:flex;flex-direction:column;gap:22px')}>
        <div>
          <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;color:var(--faint);margin-bottom:9px")}>TÀI LIỆU TRONG CHAT</div>
          <div style={css('display:flex;flex-direction:column;gap:9px')}>
            <div style={css('display:flex;align-items:center;gap:9px')}>
              <span style={css("width:20px;height:20px;border-radius:5px;background:var(--fill);color:var(--accent);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>md</span>
              <span style={css('font-size:13px;flex:1;color:var(--text)')}>plan.md</span>
              <span style={css("font-family:var(--font-mono);font-size:10px;color:var(--faint)")}>2.1KB</span>
            </div>
            <div style={css('display:flex;align-items:center;gap:9px')}>
              <span style={css("width:20px;height:20px;border-radius:5px;background:var(--success-bg);color:var(--success);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>cs</span>
              <span style={css('font-size:13px;flex:1;color:var(--text)')}>Khảo-sát.csv</span>
              <span style={css("font-family:var(--font-mono);font-size:10px;color:var(--faint)")}>18KB</span>
            </div>
          </div>
        </div>
        <div>
          <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;color:var(--faint);margin-bottom:10px")}>
            {advanced ? 'CÔNG CỤ ĐÃ DÙNG' : 'NOVA ĐÃ LÀM'}
          </div>
          {advanced && (
            <div style={css("display:flex;flex-direction:column;gap:7px;font-family:var(--font-mono);font-size:12px;color:var(--text-2)")}>
              <div style={css('display:flex;align-items:center;gap:6px')}><Icon n="search" size={13} /> web_search <span style={css('color:var(--faint)')}>· 6 kết quả</span></div>
              <div style={css('display:flex;align-items:center;gap:6px')}><Icon n="fetch" size={13} /> web_fetch <span style={css('color:var(--faint)')}>· 14.2KB</span></div>
              <div style={css('display:flex;align-items:center;gap:6px')}><Icon n="file" size={13} /> read_file <span style={css('color:var(--faint)')}>· 412 dòng</span></div>
              <div style={css('display:flex;align-items:center;gap:6px')}><Icon n="terminal" size={13} /> bash <span style={css('color:var(--faint)')}>· thoát 0</span></div>
              <div style={css('display:flex;align-items:center;gap:6px')}><Icon n="write" size={13} /> write_file <span style={css('color:var(--faint)')}>· plan.md</span></div>
            </div>
          )}
          {simpleMode && (
            <div style={css('display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--text-2)')}>
              <div>✓ Tra cứu trên web</div>
              <div>✓ Đọc một trang web</div>
              <div>✓ Mở tài liệu của bạn</div>
              <div>✓ Lưu vào tài liệu</div>
            </div>
          )}
        </div>
        {advanced && (
          <div>
            <div style={css("font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;color:var(--faint);margin-bottom:9px")}>TOKEN</div>
            <div style={css('height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-bottom:7px')}>
              <div style={css(`width:${tokenPct};height:100%;background:var(--accent)`)} />
            </div>
            <div style={css("font-family:var(--font-mono);font-size:11px;color:var(--muted)")}>{tokenLabel} · còn 58%</div>
          </div>
        )}
      </div>
    </div>
  )
}
