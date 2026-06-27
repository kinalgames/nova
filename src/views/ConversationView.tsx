import { useStore } from '../state/store'
import { css } from '../css'
import { Composer } from '../components/Composer'
import { Inspector } from '../components/Inspector'
import { Icon } from '../components/Icon'

export function ConversationView() {
  const { v } = useStore()
  if (!v.isConv) return null
  return (
    <div className="view" style={css('position:absolute;inset:0;display:flex')}>
      <div style={css('flex:1;min-width:0;display:flex;flex-direction:column')}>
        {/* a scrollable region must be keyboard-focusable (axe scrollable-region-focusable); jsx-a11y's noninteractive-tabindex is a false positive here */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div ref={v.scrollRef} tabIndex={0} role="region" aria-label="Hội thoại" style={css('flex:1;min-height:0;overflow-y:auto;display:flex;justify-content:center;scroll-behavior:smooth')}>
          <div style={css(`width:680px;max-width:100%;padding:${v.convPad}`)}>
            {v.isEmptyChat && <EmptyChat />}
            {v.hasDemo && <DemoThread />}
            {v.isDone && <DoneAnswer />}
            {v.isStream && <StreamBlock />}
            {v.isError && <ErrorBlock />}
            {v.respApproval && <ApprovalBlock />}
            <SentMessages />
          </div>
        </div>

        {/* demo state switcher */}
        <div style={css('flex-shrink:0;display:flex;justify-content:center;padding:4px 12px 0')}>
          <div style={css('display:inline-flex;align-items:center;gap:4px;background:var(--fill);border-radius:10px;padding:3px;font-size:11.5px')}>
            <span style={css('color:var(--muted);padding:0 6px')}>demo:</span>
            <button type="button" onClick={v.setStream} style={css(`padding:5px 10px;border-radius:8px;cursor:pointer;background:${v.stBgStream};color:${v.stFgStream};border:none;font:inherit;text-align:left`)}>Đang soạn</button>
            <button type="button" onClick={v.setApproval} style={css(`padding:5px 10px;border-radius:8px;cursor:pointer;background:${v.stBgApproval};color:${v.stFgApproval};border:none;font:inherit;text-align:left`)}>Chờ duyệt</button>
            <button type="button" onClick={v.setDone} style={css(`padding:5px 10px;border-radius:8px;cursor:pointer;background:${v.stBgDone};color:${v.stFgDone};border:none;font:inherit;text-align:left`)}>Hoàn tất</button>
            <button type="button" onClick={v.setError} style={css(`padding:5px 10px;border-radius:8px;cursor:pointer;background:${v.stBgError};color:${v.stFgError};border:none;font:inherit;text-align:left`)}>Lỗi</button>
          </div>
        </div>

        <Composer />
      </div>

      {/* inspector */}
      {v.inspectorInline && (
        <div style={css('width:300px;flex-shrink:0;border-left:1px solid var(--border);background:var(--panel);overflow-y:auto;animation:fadeUp .16s ease')}>
          <Inspector advanced={v.advanced} tokenPct={v.tokenPct} tokenLabel={v.tokenLabel} onClose={v.toggleInspector} />
        </div>
      )}
      {v.showReopen && (
        <button type="button" onClick={v.toggleInspector} style={css('position:absolute;top:14px;right:16px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-2);border:1px solid var(--border);border-radius:9px;padding:7px 11px;cursor:pointer;background:var(--panel);z-index:4;white-space:nowrap;font:inherit;text-align:left')}>
          <Icon n="info" size={14} /> Ngữ cảnh
        </button>
      )}
    </div>
  )
}

function EmptyChat() {
  const { v } = useStore()
  return (
    <div style={css('min-height:58vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center')}>
      <div style={css('width:48px;height:48px;border-radius:50%;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center;margin-bottom:18px')}><Icon n="nova" size={22} /></div>
      <div style={css("font-family:var(--font-display);font-size:30px")}>Cuộc trò chuyện mới</div>
      <div style={css('font-size:15px;color:var(--muted);margin-top:8px;max-width:420px;line-height:1.55')}>
        Hỏi bất cứ điều gì, đính kèm tệp, hoặc chọn một gợi ý. Nova nhớ ngữ cảnh của dự án{' '}
        <b style={css('font-weight:600;color:var(--text)')}>{v.chatProject}</b>.
      </div>
    </div>
  )
}

function DemoThread() {
  const { v } = useStore()
  return (
    <>
      {/* EXCHANGE 1: user with attachments + done answer */}
      <div style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:var(--muted);margin-bottom:10px")}>MINH</div>
      <div style={css('font-size:18px;line-height:1.6')}>Xem giúp mình moodboard này có hợp với định vị Aurora không? Tham chiếu cả brief.</div>
      <div style={css('margin-top:14px;display:flex;gap:10px;flex-wrap:wrap')}>
        <button type="button" onClick={v.openLightbox} style={css('width:150px;height:104px;border-radius:11px;background:linear-gradient(135deg,#E7C9A8,#C98F86 55%,#7E6E92);position:relative;cursor:pointer;overflow:hidden;border:1px solid rgba(0,0,0,.06);font:inherit;text-align:left')}>
          <div style={css('position:absolute;left:0;right:0;bottom:0;padding:7px 9px;background:linear-gradient(transparent,rgba(0,0,0,.45));display:flex;align-items:center;justify-content:space-between')}>
            <span style={css('font-size:11px;color:#fff')}>moodboard.png</span>
            <Icon n="expand" size={13} style={{ color: '#fff' }} />
          </div>
        </button>
        <button type="button" onClick={v.openPdf} style={css('width:200px;border:1px solid var(--border);border-radius:11px;background:var(--panel);padding:11px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;font:inherit;text-align:left')}>
          <span style={css("width:30px;height:36px;border-radius:5px;background:var(--danger-bg);color:var(--danger-strong);font-family:var(--font-mono);font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>PDF</span>
          <div style={css('flex:1;min-width:0')}>
            <div style={css('font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>Brief-Aurora.pdf</div>
            <div style={css('font-size:11.5px;color:var(--muted);margin-top:2px')}>1.2 MB · 8 trang</div>
          </div>
        </button>
      </div>
      <div style={css('height:30px')} />

      <div style={css('display:flex;align-items:center;gap:9px;margin-bottom:14px')}>
        <span style={css('width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center')}><Icon n="nova" size={13} /></span>
        <span style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:var(--accent)")}>NOVA</span>
      </div>
      <div style={css('font-size:18px;line-height:1.7')}>
        Moodboard nghiêng về tông ấm, thủ công — <b style={css('font-weight:600')}>hợp một nửa</b>. Định vị Aurora nhấn "tập trung, tối giản", nên mình gợi ý giảm hoạ tiết và tăng khoảng trắng. Chi tiết khớp/lệch mình ghi trong nhận xét.
      </div>
      <div style={css('margin-top:14px;display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--muted)')}>
        <button type="button" onClick={v.copyCode} style={css('display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:none;background:transparent;text-align:left;font:inherit')}><Icon n={v.copied ? 'check' : 'copy'} size={14} /> {v.copyLabel}</button>
        <button type="button" onClick={v.openLightbox} style={css('display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:none;background:transparent;text-align:left;font:inherit')}><Icon n="open" size={14} /> Xem moodboard</button>
      </div>

      <div style={css('height:42px')} />
      <div style={css('border-top:1px solid var(--border)')} />
      <div style={css('height:30px')} />

      {/* EXCHANGE 2: state-switchable */}
      <div style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:var(--muted);margin-bottom:10px")}>MINH</div>
      <div style={css('font-size:18px;line-height:1.6')}>
        Giờ đối chiếu benchmark đối thủ với khảo sát của mình, rồi lưu bản tóm tắt vào <em>plan.md</em>.
      </div>
      <div style={css('height:28px')} />
      <div style={css('display:flex;align-items:center;gap:9px;margin-bottom:14px')}>
        <span style={css('width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center')}><Icon n="nova" size={13} /></span>
        <span style={css("font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:var(--accent)")}>NOVA</span>
        {v.isStream && <span style={css('font-size:12px;color:var(--faint)')}>· đang trả lời</span>}
      </div>

      {v.showTrace && <Trace />}
    </>
  )
}

function Trace() {
  const { v } = useStore()
  return (
    <>
      <button type="button" onClick={v.toggleTrace} style={css('display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;color:var(--text-2);margin-bottom:14px;border:1px solid var(--border);background:var(--panel);border-radius:10px;padding:9px 13px;font:inherit;text-align:left')}>
        <span style={css(`width:18px;height:18px;border-radius:50%;background:${v.traceIconBg};color:${v.traceIconFg};display:flex;align-items:center;justify-content:center`)}><Icon n={v.isStream ? 'focus' : 'check'} size={11} stroke={2.25} /></span>
        <span style={css('color:var(--text)')}>{v.traceSummary}</span>
        <span style={css('color:var(--faint);font-size:12px')}>{v.traceCaret}</span>
      </button>
      {v.traceOpen && (
        <div style={css('border-left:2px solid var(--border);padding-left:22px;display:flex;flex-direction:column;gap:15px;margin-bottom:6px')}>
          {/* think */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:10px;height:10px;border-radius:50%;background:var(--bg);border:2px dashed var(--border)')} />
            {v.advanced && <div style={css("font-family:var(--font-mono);font-size:9.5px;letter-spacing:.1em;color:var(--faint);margin-bottom:4px")}>SUY NGHĨ</div>}
            <div style={css('font-size:14.5px;color:var(--muted);font-style:italic;line-height:1.55')}>Cần số liệu benchmark mới nhất trước khi so sánh. Tìm web đã.</div>
          </div>
          {/* web_search */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:2px solid var(--accent)')} />
            <div style={css('font-size:14.5px;color:var(--text)')}>Tra cứu trên web <span style={css('color:var(--muted)')}>— benchmark ra mắt của đối thủ</span></div>
            {v.advanced && (
              <div style={css('margin-top:7px;display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                <span style={css("display:inline-flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:11.5px;color:var(--muted);white-space:nowrap")}><Icon n="search" size={13} /> web_search</span>
                <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--muted)")}>"competitor launch benchmarks 2026"</span>
                <span style={css("margin-left:auto;font-family:var(--font-mono);font-size:10.5px;color:var(--success)")}>6 kết quả</span>
              </div>
            )}
          </div>
          {/* web_fetch ERROR then retry */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:2px solid var(--danger)')} />
            <div style={css('font-size:14.5px;color:var(--text)')}>⚠ Một trang không tải được <span style={css('color:var(--muted)')}>— đã thử nguồn khác</span></div>
            {v.advanced && (
              <div style={css('margin-top:7px;display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                <span style={css("display:inline-flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:11.5px;color:var(--muted);white-space:nowrap")}><Icon n="fetch" size={13} /> web_fetch</span>
                <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--muted)")}>openview.dev/report</span>
                <span style={css("margin-left:auto;font-family:var(--font-mono);font-size:10.5px;color:var(--danger)")}>timeout · thử lại ✓</span>
              </div>
            )}
          </div>
          {/* web_fetch ok */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:2px solid var(--accent)')} />
            <div style={css('font-size:14.5px;color:var(--text)')}>Đọc một trang web <span style={css('color:var(--muted)')}>— techreview.io</span></div>
            {v.advanced && (
              <div style={css("margin-top:7px;font-size:13.5px;line-height:1.5;color:var(--text-2);font-style:italic;border-left:2px solid var(--border);padding-left:12px")}>
                "Đối thủ dẫn đầu đạt kích hoạt 38% trong 72 giờ đầu…"
              </div>
            )}
          </div>
          {/* read_file */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:2px solid var(--accent)')} />
            <div style={css('font-size:14.5px;color:var(--text)')}>Mở tài liệu của bạn <span style={css('color:var(--muted)')}>— Khảo-sát.csv</span></div>
            {v.advanced && (
              <div style={css('margin-top:7px;display:flex;align-items:center;gap:9px')}>
                <span style={css("display:inline-flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:11.5px;color:var(--muted)")}><Icon n="file" size={13} /> read_file</span>
                <span style={css("margin-left:auto;font-family:var(--font-mono);font-size:10.5px;color:var(--success)")}>412 dòng</span>
              </div>
            )}
          </div>
          {/* bash */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:2px solid var(--accent)')} />
            <div style={css('font-size:14.5px;color:var(--text)')}>Chạy tính toán <span style={css('color:var(--muted)')}>— gộp &amp; đối chiếu</span></div>
            {v.advanced && (
              <div style={css('margin-top:8px;background:var(--code-bg);border-radius:10px;overflow:hidden')}>
                <div style={css("padding:10px 14px;font-family:var(--font-mono);font-size:11.5px;line-height:1.7;color:var(--code-fg)")}>
                  <span style={css('color:var(--code-dim)')}>$</span> python analyze.py --merge survey.csv bench.json
                  <br />
                  <span style={css('color:#9FBF9F')}>✓ kích hoạt của mình: 29%</span> <span style={css('color:var(--code-dim)')}>(mục tiêu 38%)</span>
                </div>
              </div>
            )}
          </div>
          {/* write */}
          <div style={css('position:relative')}>
            <span style={css('position:absolute;left:-29px;top:2px;width:11px;height:11px;border-radius:50%;background:var(--accent)')} />
            <div style={css('font-size:14.5px;color:var(--text)')}>Lưu vào tài liệu <span style={css('color:var(--muted)')}>— plan.md</span></div>
            {v.advanced && (
              <div style={css('margin-top:7px;display:flex;align-items:center;gap:9px')}>
                <span style={css("display:inline-flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:11.5px;color:var(--muted)")}><Icon n="write" size={13} /> write_file</span>
                <span style={css("margin-left:auto;font-family:var(--font-mono);font-size:10.5px;color:var(--success)")}>đã ghi · 2.1 KB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function DoneAnswer() {
  const { v } = useStore()
  return (
    <>
      <div style={css('margin-top:20px;font-size:18px;line-height:1.7')}>
        Xong. Mình đã đối chiếu khảo sát với 6 đối thủ và lưu tóm tắt vào <em>plan.md</em>. Khoảng cách chính:
      </div>
      <div style={css('margin-top:14px;font-size:18px;line-height:1.75')}>
        — Kích hoạt 72 giờ của mình <b style={css('font-weight:600')}>29%</b>, thấp hơn mức dẫn đầu <b style={css('font-weight:600')}>38%</b>.
        <br />— Nguyên nhân: đăng ký nhiều bước. Đối thủ tốt nhất chỉ một bước.
        <br />— Đề xuất: gộp đăng ký + thiết lập đầu thành một màn hình trước tuần ra mắt.
      </div>
      <div style={css("margin-top:16px;border:1px solid var(--border);border-radius:10px;overflow:hidden;font-family:var(--font-body);font-size:13.5px")}>
        <div style={css('display:grid;grid-template-columns:1.3fr 1fr 1.1fr')}>
          <div style={css('padding:10px 13px;background:var(--panel);color:var(--muted);font-weight:500')}>Nhóm</div>
          <div style={css('padding:10px 13px;background:var(--panel);color:var(--muted);font-weight:500')}>Kích hoạt 72h</div>
          <div style={css('padding:10px 13px;background:var(--panel);color:var(--muted);font-weight:500')}>Onboarding</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>Của mình</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border);color:var(--danger)')}>29%</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>Nhiều bước</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>Dẫn đầu</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border);color:var(--success)')}>38%</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>Một bước</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>TB ngành</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>33%</div>
          <div style={css('padding:10px 13px;border-top:1px solid var(--border)')}>2–3 bước</div>
        </div>
      </div>
      <div style={css('margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)')}>
        <span>Nguồn:</span>
        <button type="button" onClick={v.openPdf} style={css('cursor:pointer;border:1px solid var(--border);border-radius:6px;padding:3px 8px;background:transparent;font:inherit;text-align:left')}><sup>1</sup> techreview.io</button>
        <button type="button" onClick={v.openPdf} style={css('cursor:pointer;border:1px solid var(--border);border-radius:6px;padding:3px 8px;background:transparent;font:inherit;text-align:left')}><sup>2</sup> openview.dev</button>
      </div>
      <div style={css('margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--muted)')}>
        <button type="button" onClick={v.copyCode} style={css('display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:none;background:transparent;text-align:left;font:inherit')}><Icon n={v.copied ? 'check' : 'copy'} size={14} /> {v.copyLabel}</button>
        <button type="button" onClick={v.setError} style={css('display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:none;background:transparent;text-align:left;font:inherit')}><Icon n="retry" size={14} /> Thử lại</button>
        <button type="button" onClick={v.openMd} style={css('display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:none;background:transparent;text-align:left;font:inherit')}><Icon n="open" size={14} /> Mở plan.md</button>
      </div>
      <div style={css("margin-top:20px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;color:var(--label);margin-bottom:9px")}>TỆP NOVA ĐÃ DÙNG</div>
      <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
        <button type="button" onClick={v.openMd} style={css('display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:9px 12px;cursor:pointer;font:inherit;text-align:left')}>
          <span style={css("width:24px;height:28px;border-radius:4px;background:var(--fill);color:var(--accent);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>MD</span>
          <div><div style={css('font-size:13px')}>plan.md</div><div style={css('font-size:11px;color:var(--muted)')}>2.1 KB · vừa cập nhật</div></div>
        </button>
        <button type="button" onClick={v.openCode} style={css('display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:9px 12px;cursor:pointer;font:inherit;text-align:left')}>
          <span style={css("width:24px;height:28px;border-radius:4px;background:var(--info-bg);color:var(--info);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>PY</span>
          <div><div style={css('font-size:13px')}>analyze.py</div><div style={css('font-size:11px;color:var(--muted)')}>1.4 KB</div></div>
        </button>
        <button type="button" onClick={v.openCsv} style={css('display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:9px 12px;cursor:pointer;font:inherit;text-align:left')}>
          <span style={css("width:24px;height:28px;border-radius:4px;background:var(--success-bg);color:var(--success);font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>CSV</span>
          <div><div style={css('font-size:13px')}>Khảo-sát.csv</div><div style={css('font-size:11px;color:var(--muted)')}>18 KB · 412 dòng</div></div>
        </button>
      </div>
    </>
  )
}

function StreamBlock() {
  const { v } = useStore()
  return (
    <div style={css('margin-top:18px')}>
      <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:12px')}>
        <span style={css('position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center')}>
          <span style={css('position:absolute;width:18px;height:18px;border-radius:50%;background:var(--accent-line);animation:pulseRing 1.6s ease-out infinite')} />
          <span style={css('width:8px;height:8px;border-radius:50%;background:var(--accent)')} />
        </span>
        <span style={css('font-size:14px;color:var(--text-2)')}>Đang viết câu trả lời…</span>
      </div>
      <div style={css('font-size:18px;line-height:1.75')}>
        Xong phần đối chiếu. Kích hoạt 72 giờ của mình đạt <b style={css('font-weight:600')}>29%</b>, còn cách mức dẫn đầu 38%. Nguyên nhân chính là
        <span style={css('display:inline-block;width:2px;height:19px;background:var(--accent);vertical-align:-3px;margin-left:2px;animation:caret 1.1s steps(1) infinite')} />
      </div>
      <div style={css('margin-top:16px')}>
        <button type="button" onClick={v.setDone} style={css('display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:9px;padding:7px 13px;font-size:13px;color:var(--text-2);cursor:pointer;background:var(--panel);font:inherit;text-align:left')}><Icon n="stop" size={13} fill="currentColor" stroke={0} /> Dừng</button>
      </div>
    </div>
  )
}

function ErrorBlock() {
  const { v } = useStore()
  return (
    <>
      <div style={css('margin-top:18px;font-size:18px;line-height:1.75;color:var(--text-2)')}>
        Xong phần đối chiếu. Kích hoạt 72 giờ của mình đạt <b style={css('font-weight:600;color:var(--text)')}>29%</b>, còn cách mức dẫn đầu…
      </div>
      <div style={css('margin-top:16px;border:1px solid var(--danger-line);background:var(--danger-bg);border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px')}>
        <span style={css('width:22px;height:22px;border-radius:50%;background:var(--danger-strong);color:var(--on-ink);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0')}>!</span>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('font-size:15px;color:var(--text)')}>Phản hồi bị gián đoạn</div>
          <div style={css('font-size:13.5px;color:var(--danger);margin-top:3px;line-height:1.5')}>
            Mất kết nối tới mô hình. Nội dung phía trên đã được giữ lại.
            {v.advanced && <span style={css("font-family:var(--font-mono);font-size:11px;color:var(--danger)")}> · err 503 · stream_closed</span>}
          </div>
        </div>
        <button type="button" onClick={v.setDone} style={css('display:inline-flex;align-items:center;gap:6px;flex-shrink:0;background:var(--ink);color:var(--bg);border-radius:9px;padding:8px 13px;font-size:13px;cursor:pointer;border:none;font:inherit;text-align:left')}><Icon n="retry" size={14} /> Thử lại</button>
      </div>
    </>
  )
}

function ApprovalBlock() {
  const { v } = useStore()
  return (
    <>
      <div style={css('margin-top:18px;font-size:18px;line-height:1.7')}>Mình cần chạy một lệnh để gộp và đối chiếu dữ liệu. Cho phép nhé?</div>
      <div style={css('margin-top:14px;border:1px solid var(--border);background:var(--panel);border-radius:13px;overflow:hidden')}>
        <div style={css('padding:12px 15px;display:flex;align-items:center;gap:11px;border-bottom:1px solid var(--border)')}>
          <span style={css('width:30px;height:30px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0')}><Icon n="terminal" size={15} /></span>
          <div style={css('flex:1;min-width:0')}>
            <div style={css('font-size:14.5px')}>Chạy lệnh (bash)</div>
            <div style={css("font-family:var(--font-mono);font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>python analyze.py --merge survey.csv bench.json</div>
          </div>
        </div>
        <div style={css('padding:11px 15px;display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
          <button type="button" onClick={v.approveTool} style={css('background:var(--ink);color:var(--bg);border-radius:9px;padding:8px 16px;font-size:13.5px;cursor:pointer;border:none;font:inherit;text-align:left')}>Cho phép</button>
          <button type="button" onClick={v.denyTool} style={css('border:1px solid var(--border);border-radius:9px;padding:8px 16px;font-size:13.5px;cursor:pointer;color:var(--muted);background:transparent;font:inherit;text-align:left')}>Từ chối</button>
          <span style={css('font-size:12px;color:var(--muted)')}>Chỉ chạy trong môi trường an toàn</span>
        </div>
      </div>
    </>
  )
}

function SentMessages() {
  const { v } = useStore()
  return (
    <>
      {v.sent.map((m, i) => (
        <div key={i}>
          <div style={css('margin:30px 0 10px;display:flex;align-items:center;gap:9px')}>
            {m.isNova && (
              <span style={css('width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center')}><Icon n="nova" size={13} /></span>
            )}
            <span style={css(`font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;color:${m.color}`)}>{m.who}</span>
          </div>
          <div style={css('font-size:18px;line-height:1.7')}>{m.text}</div>
        </div>
      ))}
      {v.typing && (
        <div style={css('margin-top:24px;display:flex;align-items:center;gap:10px')}>
          <span style={css('position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center')}>
            <span style={css('position:absolute;width:18px;height:18px;border-radius:50%;background:var(--accent-line);animation:pulseRing 1.6s ease-out infinite')} />
            <span style={css('width:8px;height:8px;border-radius:50%;background:var(--accent)')} />
          </span>
          <span style={css('font-size:14px;color:var(--text-2)')}>{v.typingLabel}</span>
        </div>
      )}
    </>
  )
}
