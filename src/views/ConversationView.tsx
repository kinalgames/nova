import { useStore } from '../state/store'
import { Composer } from '../components/Composer'
import { Icon } from '../components/Icon'

const USER_LABEL = 'mb-2.5 font-mono text-eyebrow tracking-[.12em] text-muted'
const NOVA_HEAD = 'mb-3 flex items-center gap-2'
const NOVA_DOT = 'flex size-[22px] items-center justify-center rounded-full bg-accent text-bg'
const NOVA_TAG = 'font-mono text-eyebrow tracking-[.12em] text-accent-text'
const ACT = 'inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-left'
const NODE = 'absolute -left-[29px] top-0.5 size-[11px] rounded-full border-2 bg-bg'
const NODE_TEXT = 'text-body text-text'
const TOOL_TAG = 'inline-flex items-center gap-1 font-mono text-meta text-muted'
const META = 'mt-1.5 flex items-center gap-2'
const TCELL = 'border-t border-border px-3 py-2.5'
const THEAD = 'bg-panel px-3 py-2.5 font-medium text-muted'
const CARET = 'ml-0.5 inline-block h-[19px] w-0.5 bg-accent align-[-3px] animate-[caret_1.1s_steps(1)_infinite]'
const FILE_PILL = 'flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-panel px-3 py-2 text-left'
const FILE_BADGE = 'flex h-7 w-6 shrink-0 items-center justify-center rounded-xs font-mono text-micro'

export function ConversationView() {
  const { v } = useStore()
  return (
    <div className="view absolute inset-0 flex">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* a scrollable region must be keyboard-focusable (axe scrollable-region-focusable); jsx-a11y's noninteractive-tabindex is a false positive here */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div ref={v.scrollRef} tabIndex={0} role="region" aria-label="Hội thoại" className="flex min-h-0 flex-1 justify-center overflow-y-auto scroll-smooth">
          <div className="w-[680px] max-w-full" style={{ padding: v.convPad }}>
            {v.isEmptyChat && <EmptyChat />}
            {/* the scripted showcase (thread + state blocks + switcher) belongs to
                the demo conversation only; real conversations show their own thread */}
            {v.hasDemo && <DemoThread />}
            {v.hasDemo && v.isDone && <DoneAnswer />}
            {v.hasDemo && v.isStream && <StreamBlock />}
            {v.hasDemo && v.isError && <ErrorBlock />}
            {v.hasDemo && v.respApproval && <ApprovalBlock />}
            <SentMessages />
          </div>
        </div>

        {/* demo state switcher — only on the scripted demo conversation */}
        {v.hasDemo && (
          <div className="flex shrink-0 justify-center px-3 pt-1">
            <div className="inline-flex items-center gap-1 rounded-sm bg-fill p-0.5 text-meta">
              <span className="px-1.5 text-muted">demo:</span>
              <button type="button" onClick={v.setStream} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgStream, color: v.stFgStream }}>Đang soạn</button>
              <button type="button" onClick={v.setApproval} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgApproval, color: v.stFgApproval }}>Chờ duyệt</button>
              <button type="button" onClick={v.setDone} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgDone, color: v.stFgDone }}>Hoàn tất</button>
              <button type="button" onClick={v.setError} className="cursor-pointer rounded-sm border-none px-2.5 py-1 text-left" style={{ background: v.stBgError, color: v.stFgError }}>Lỗi</button>
            </div>
          </div>
        )}

        <Composer />
      </div>
    </div>
  )
}

function EmptyChat() {
  const { v } = useStore()
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-bg">
        <Icon n="nova" size={22} />
      </div>
      <div className="font-display text-h2">Cuộc trò chuyện mới</div>
      <div className="mt-2 max-w-[420px] text-body leading-normal text-muted">
        Hỏi bất cứ điều gì, đính kèm tệp, hoặc chọn một gợi ý. Nova nhớ ngữ cảnh của dự án{' '}
        <b className="font-semibold text-text">{v.chatProject}</b>.
      </div>
    </div>
  )
}

function DemoThread() {
  const { v } = useStore()
  return (
    <>
      {/* EXCHANGE 1: user with attachments + done answer */}
      <div className={USER_LABEL}>MINH</div>
      <div className="text-lead leading-normal">Xem giúp mình moodboard này có hợp với định vị Aurora không? Tham chiếu cả brief.</div>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={v.openLightbox}
          className="relative h-[104px] w-[150px] cursor-pointer overflow-hidden rounded-md border border-[rgba(0,0,0,.06)] bg-[linear-gradient(135deg,#E7C9A8,#C98F86_55%,#7E6E92)] text-left"
        >
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[linear-gradient(transparent,rgba(0,0,0,.45))] px-2 py-1.5">
            <span className="text-eyebrow text-white">moodboard.png</span>
            <Icon n="expand" size={13} className="text-white" />
          </div>
        </button>
        <button
          type="button"
          onClick={v.openPdf}
          className="flex w-[200px] cursor-pointer items-center gap-2.5 rounded-md border border-border bg-panel px-3 py-3 text-left"
        >
          <span className={`${FILE_BADGE} h-9 w-[30px] bg-danger-bg text-micro text-danger-text`}>PDF</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-ui">Brief-Aurora.pdf</div>
            <div className="mt-0.5 text-meta text-muted">1.2 MB · 8 trang</div>
          </div>
        </button>
      </div>
      <div className="h-[30px]" />

      <div className={NOVA_HEAD}>
        <span className={NOVA_DOT}><Icon n="nova" size={13} /></span>
        <span className={NOVA_TAG}>NOVA</span>
      </div>
      <div className="text-lead leading-relaxed">
        Moodboard nghiêng về tông ấm, thủ công — <b className="font-semibold">hợp một nửa</b>. Định vị Aurora nhấn "tập trung, tối giản", nên mình gợi ý giảm hoạ tiết và tăng khoảng trắng. Chi tiết khớp/lệch mình ghi trong nhận xét.
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-small text-muted">
        <button type="button" onClick={v.copyCode} className={ACT}><Icon n={v.copied ? 'check' : 'copy'} size={14} /> {v.copyLabel}</button>
        <button type="button" onClick={v.openLightbox} className={ACT}><Icon n="open" size={14} /> Xem moodboard</button>
      </div>

      <div className="h-[42px]" />
      <div className="border-t border-border" />
      <div className="h-[30px]" />

      {/* EXCHANGE 2: state-switchable */}
      <div className={USER_LABEL}>MINH</div>
      <div className="text-lead leading-normal">
        Giờ đối chiếu benchmark đối thủ với khảo sát của mình, rồi lưu bản tóm tắt vào <em>plan.md</em>.
      </div>
      <div className="h-[28px]" />
      <div className={NOVA_HEAD}>
        <span className={NOVA_DOT}><Icon n="nova" size={13} /></span>
        <span className={NOVA_TAG}>NOVA</span>
        {v.isStream && <span className="text-meta text-faint">· đang trả lời</span>}
      </div>

      {v.showTrace && <Trace />}
    </>
  )
}

function Trace() {
  const { v } = useStore()
  return (
    <>
      <button
        type="button"
        onClick={v.toggleTrace}
        className="mb-3 inline-flex cursor-pointer items-center gap-2.5 rounded-sm border border-border bg-panel px-3 py-2 text-left text-ui text-text-2"
      >
        <span className="flex size-[18px] items-center justify-center rounded-full" style={{ background: v.traceIconBg, color: v.traceIconFg }}><Icon n={v.isStream ? 'focus' : 'check'} size={11} stroke={2.25} /></span>
        <span className="text-text">{v.traceSummary}</span>
        <span className="inline-flex items-center gap-1 text-meta text-faint">
          {v.traceCaret}
          <Icon n="caret" size={12} className={v.traceOpen ? 'rotate-180' : undefined} />
        </span>
      </button>
      {v.traceOpen && (
        <div className="relative mb-1.5 flex flex-col gap-4 border-l-2 border-border pl-5">
          {/* think */}
          <div className="relative">
            <span className="absolute -left-[29px] top-0.5 size-2.5 rounded-full border-2 border-dashed border-border bg-bg" />
            <div className="text-body italic leading-normal text-muted">Cần số liệu benchmark mới nhất trước khi so sánh. Tìm web đã.</div>
          </div>
          {/* web_search */}
          <div className="relative">
            <span className={`${NODE} border-accent`} />
            <div className={NODE_TEXT}>Tra cứu trên web <span className="text-muted">— benchmark ra mắt của đối thủ</span></div>
            {v.advanced && (
              <div className={`${META} flex-wrap`}>
                <span className={`${TOOL_TAG} whitespace-nowrap`}><Icon n="search" size={13} /> web_search</span>
                <span className="font-mono text-eyebrow text-muted">"competitor launch benchmarks 2026"</span>
                <span className="ml-auto font-mono text-eyebrow text-success-text">6 kết quả</span>
              </div>
            )}
          </div>
          {/* web_fetch ERROR then retry */}
          <div className="relative">
            <span className={`${NODE} border-danger`} />
            <div className={NODE_TEXT}>⚠ Một trang không tải được <span className="text-muted">— đã thử nguồn khác</span></div>
            {v.advanced && (
              <div className={`${META} flex-wrap`}>
                <span className={`${TOOL_TAG} whitespace-nowrap`}><Icon n="fetch" size={13} /> web_fetch</span>
                <span className="font-mono text-eyebrow text-muted">openview.dev/report</span>
                <span className="ml-auto font-mono text-eyebrow text-danger-text">timeout · thử lại ✓</span>
              </div>
            )}
          </div>
          {/* web_fetch ok */}
          <div className="relative">
            <span className={`${NODE} border-accent`} />
            <div className={NODE_TEXT}>Đọc một trang web <span className="text-muted">— techreview.io</span></div>
            {v.advanced && (
              <div className="mt-1.5 border-l-2 border-border pl-3 text-ui italic leading-normal text-text-2">
                "Đối thủ dẫn đầu đạt kích hoạt 38% trong 72 giờ đầu…"
              </div>
            )}
          </div>
          {/* read_file */}
          <div className="relative">
            <span className={`${NODE} border-accent`} />
            <div className={NODE_TEXT}>Mở tài liệu của bạn <span className="text-muted">— Khảo-sát.csv</span></div>
            {v.advanced && (
              <div className={META}>
                <span className={TOOL_TAG}><Icon n="file" size={13} /> read_file</span>
                <span className="ml-auto font-mono text-eyebrow text-success-text">412 dòng</span>
              </div>
            )}
          </div>
          {/* bash */}
          <div className="relative">
            <span className={`${NODE} border-accent`} />
            <div className={NODE_TEXT}>Chạy tính toán <span className="text-muted">— gộp &amp; đối chiếu</span></div>
            {v.advanced && (
              <div className="mt-2 overflow-hidden rounded-sm bg-code-bg">
                <div className="px-3 py-2.5 font-mono text-meta leading-relaxed text-code-fg">
                  <span className="text-code-dim">$</span> python analyze.py --merge survey.csv bench.json
                  <br />
                  <span className="text-[#9FBF9F]">✓ kích hoạt của mình: 29%</span> <span className="text-code-dim">(mục tiêu 38%)</span>
                </div>
              </div>
            )}
          </div>
          {/* write */}
          <div className="relative">
            <span className="absolute -left-[29px] top-0.5 size-[11px] rounded-full bg-accent" />
            <div className={NODE_TEXT}>Lưu vào tài liệu <span className="text-muted">— plan.md</span></div>
            {v.advanced && (
              <div className={META}>
                <span className={TOOL_TAG}><Icon n="write" size={13} /> write_file</span>
                <span className="ml-auto font-mono text-eyebrow text-success-text">đã ghi · 2.1 KB</span>
              </div>
            )}
          </div>
          {!v.isStream && (
            <div className="relative">
              <span className="absolute -left-[30px] top-px flex size-[13px] items-center justify-center rounded-full bg-accent text-bg"><Icon n="check" size={9} stroke={2.5} /></span>
              <div className="text-ui font-medium text-text-2">Hoàn tất <span className="font-normal text-faint">· 6.4 giây</span></div>
            </div>
          )}
          {!v.isStream && (
            <span aria-hidden className="absolute bottom-0 left-0 h-[14px] w-0.5 bg-bg" />
          )}
        </div>
      )}
    </>
  )
}

function DoneAnswer() {
  const { v } = useStore()
  return (
    <>
      <div className="mt-5 text-lead leading-relaxed">
        Xong. Mình đã đối chiếu khảo sát với 6 đối thủ và lưu tóm tắt vào <em>plan.md</em>. Khoảng cách chính:
      </div>
      <div className="mt-3 text-lead leading-relaxed">
        — Kích hoạt 72 giờ của mình <b className="font-semibold">29%</b>, thấp hơn mức dẫn đầu <b className="font-semibold">38%</b>.
        <br />— Nguyên nhân: đăng ký nhiều bước. Đối thủ tốt nhất chỉ một bước.
        <br />— Đề xuất: gộp đăng ký + thiết lập đầu thành một màn hình trước tuần ra mắt.
      </div>
      <div className="mt-4 overflow-hidden rounded-sm border border-border font-sans text-ui">
        <div className="grid grid-cols-[1.3fr_1fr_1.1fr]">
          <div className={THEAD}>Nhóm</div>
          <div className={THEAD}>Kích hoạt 72h</div>
          <div className={THEAD}>Onboarding</div>
          <div className={TCELL}>Của mình</div>
          <div className={`${TCELL} text-danger-text`}>29%</div>
          <div className={TCELL}>Nhiều bước</div>
          <div className={TCELL}>Dẫn đầu</div>
          <div className={`${TCELL} text-success-text`}>38%</div>
          <div className={TCELL}>Một bước</div>
          <div className={TCELL}>TB ngành</div>
          <div className={TCELL}>33%</div>
          <div className={TCELL}>2–3 bước</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-small text-muted">
        <span>Nguồn:</span>
        <button type="button" onClick={v.openPdf} className="cursor-pointer rounded-xs border border-border bg-transparent px-2 py-0.5 text-left"><sup>1</sup> techreview.io</button>
        <button type="button" onClick={v.openPdf} className="cursor-pointer rounded-xs border border-border bg-transparent px-2 py-0.5 text-left"><sup>2</sup> openview.dev</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-small text-muted">
        <button type="button" onClick={v.copyCode} className={ACT}><Icon n={v.copied ? 'check' : 'copy'} size={14} /> {v.copyLabel}</button>
        <button type="button" onClick={v.setError} className={ACT}><Icon n="retry" size={14} /> Thử lại</button>
        <button type="button" onClick={v.openMd} className={ACT}><Icon n="open" size={14} /> Mở plan.md</button>
      </div>
      <div className="mb-2 mt-5 font-mono text-eyebrow tracking-[.12em] text-label">TỆP NOVA ĐÃ DÙNG</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={v.openMd} className={FILE_PILL}>
          <span className={`${FILE_BADGE} bg-fill text-accent-text`}>MD</span>
          <div><div className="text-small">plan.md</div><div className="text-eyebrow text-muted">2.1 KB · vừa cập nhật</div></div>
        </button>
        <button type="button" onClick={v.openCode} className={FILE_PILL}>
          <span className={`${FILE_BADGE} bg-info-bg text-info`}>PY</span>
          <div><div className="text-small">analyze.py</div><div className="text-eyebrow text-muted">1.4 KB</div></div>
        </button>
        <button type="button" onClick={v.openCsv} className={FILE_PILL}>
          <span className={`${FILE_BADGE} bg-success-bg text-success-text`}>CSV</span>
          <div><div className="text-small">Khảo-sát.csv</div><div className="text-eyebrow text-muted">18 KB · 412 dòng</div></div>
        </button>
      </div>
    </>
  )
}

function NovaThinking() {
  return (
    <span
      role="img"
      aria-label="Nova đang làm việc"
      className="relative flex size-[22px] shrink-0 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full bg-accent-line animate-[pulseRing_1.6s_ease-out_infinite]" />
      <span className="relative flex size-[22px] items-center justify-center rounded-full bg-accent text-bg animate-[breathe_2.4s_ease-in-out_infinite]">
        <Icon n="nova" size={13} />
      </span>
    </span>
  )
}

function StreamBlock() {
  const { v } = useStore()
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center gap-2.5">
        <NovaThinking />
        <span className="text-ui text-text-2">Đang viết câu trả lời…</span>
      </div>
      <div className="text-lead leading-relaxed">
        Xong phần đối chiếu. Kích hoạt 72 giờ của mình đạt <b className="font-semibold">29%</b>, còn cách mức dẫn đầu 38%. Nguyên nhân chính là
        <span className={CARET} />
      </div>
      <div className="mt-4">
        <button type="button" onClick={v.setDone} className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-panel px-3 py-1.5 text-left text-small text-text-2"><Icon n="stop" size={13} fill="currentColor" stroke={0} /> Dừng</button>
      </div>
    </div>
  )
}

function ErrorBlock() {
  const { v } = useStore()
  return (
    <>
      <div className="mt-4 text-lead leading-relaxed text-text-2">
        Xong phần đối chiếu. Kích hoạt 72 giờ của mình đạt <b className="font-semibold text-text">29%</b>, còn cách mức dẫn đầu…
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-md border border-danger-line bg-danger-bg px-4 py-3">
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-danger-strong text-small text-on-ink">!</span>
        <div className="min-w-0 flex-1">
          <div className="text-body text-text">Phản hồi bị gián đoạn</div>
          <div className="mt-0.5 text-ui leading-normal text-danger-text">
            Mất kết nối tới mô hình. Nội dung phía trên đã được giữ lại.
            {v.advanced && <span className="font-mono text-eyebrow text-danger-text"> · err 503 · stream_closed</span>}
          </div>
        </div>
        <button type="button" onClick={v.setDone} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border-none bg-ink px-3 py-2 text-left text-small text-bg"><Icon n="retry" size={14} /> Thử lại</button>
      </div>
    </>
  )
}

function ApprovalBlock() {
  const { v } = useStore()
  return (
    <>
      <div className="mt-4 text-lead leading-relaxed">Mình cần chạy một lệnh để gộp và đối chiếu dữ liệu. Cho phép nhé?</div>
      <div className="mt-3 overflow-hidden rounded-md border border-border bg-panel">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent-text"><Icon n="terminal" size={15} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-body">Chạy lệnh (bash)</div>
            <div className="truncate font-mono text-meta text-muted">python analyze.py --merge survey.csv bench.json</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
          <button type="button" onClick={v.approveTool} className="cursor-pointer rounded-sm border-none bg-ink px-4 py-2 text-left text-ui text-bg">Cho phép</button>
          <button type="button" onClick={v.denyTool} className="cursor-pointer rounded-sm border border-border bg-transparent px-4 py-2 text-left text-ui text-muted">Từ chối</button>
          <span className="text-meta text-muted">Chỉ chạy trong môi trường an toàn</span>
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
          <div className="mb-2.5 mt-8 flex items-center gap-2">
            {m.isNova && (
              <span className={NOVA_DOT}><Icon n="nova" size={13} /></span>
            )}
            <span className="font-mono text-eyebrow tracking-[.12em]" style={{ color: m.color }}>{m.who}</span>
          </div>
          <div className="text-lead leading-relaxed">
            {m.text}
            {i === v.sent.length - 1 && v.typing && m.isNova && (
              <span className={CARET} />
            )}
          </div>
        </div>
      ))}
      {v.typing && (
        <div className="mt-6 flex items-center gap-2.5">
          <NovaThinking />
          <span className="text-ui text-text-2">{v.typingLabel}</span>
        </div>
      )}
    </>
  )
}
