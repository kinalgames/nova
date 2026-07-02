# UI/UX Audit — 2026-07-02

Audit 7 trục theo yêu cầu product: dark mode · i18n · responsive/touch (iOS,
tablet, PC) · interaction patterns · active states · độ mượt/performance ·
flicker & layout shift. Phần lớn phát hiện bằng phân tích tĩnh (grep + đọc
code); mục nào cần đo động có ghi chú «verify động».

Severity: **P0** sai rõ, user thấy ngay · **P1** sai trong điều kiện phổ biến
(dark mode, touch, EN) · **P2** đáng sửa, ít người gặp · **P3** polish.

## 1. Dark mode

Token system nền tảng TỐT (light + dark đầy đủ trong `index.css`,
`@custom-variant dark`). Vấn đề là các màu hardcode NGOÀI token:

| # | Sev | Vấn đề | Vị trí | Hướng sửa |
|---|-----|--------|--------|-----------|
| D1 | P0 | Highlight menu/dropdown `data-[highlighted]:bg-black/[0.04]`, `hover:bg-black/[...]` — đen 4% trên nền tối ≈ vô hình. Đây chính là lỗi «dropdown mode trợ lý» user báo. | `menu.ts`, `TopBar.tsx`, `Composer.tsx` (ROW/TOOL_ROW + 2 dropdown), `CommandPalette.tsx`, `MobileDrawer.tsx`, `SettingsDialog.tsx` (tab hover), `ProjectView.tsx` | Token mới `--hover-1`/`--hover-2` (light: đen 3.5–4%, dark: trắng 6–7%), map qua `@theme inline` → dùng `bg-hover-1` |
| D2 | P0 | `[data-hover="soft"]` trong index.css hardcode `rgba(0,0,0,.035)` — Sidebar hover vô hình trong dark. Helpers `soft2/border/white/text` không còn nơi dùng (`white` = flash trắng nếu dùng ở dark). | `index.css` + `Sidebar.tsx` (7 chỗ) | `soft` dùng `--hover-1`; xóa helpers không dùng |
| D3 | P1 | Overlay scrim hardcode `rgba(27,26,22,0.28)` / `rgba(20,18,15,…)` — tông mực light; dark mode cần scrim đậm hơn để tách lớp. | `RenameDialog`, `CheatsheetDialog`, `NewProjectDialog`, `MobileDrawer`, `CommandPalette`, `SettingsDialog`, `Preview`, `ProjectConfigView` | Token `--scrim` (0.28/0.5) + `--scrim-strong` (0.45→0.65) + `--scrim-lightbox` (0.82/0.88), map → `bg-scrim…` |
| D4 | P1 | Badge màu mềm hardcode theo light: `rgba(59,91,169,.12)` v.v. — trong dark thành mảng tối bẩn, chữ khó đọc (SettingsDialog user báo nằm ở đây: badge provider + preset cards). | `defs.ts` (presetDefs, provDefs gemini/openai badgeBg, suggestionDefs) | `color-mix(in srgb, var(--info) 12%, transparent)` — tự đổi theo theme vì token gốc đổi |
| D5 | P2 | Border ảnh staged/tray `rgba(0,0,0,.06)` vô hình dark. | `Composer.tsx`, `MessageView.tsx` | `var(--border)` hoặc token `--edge-soft` |
| D6 | P2 | `HomeView` `hover:border-[#d9d2c4]` hardcode light. | `views/HomeView.tsx` | `hover:border-border-2`-tương-đương token đậm hơn (`--border-hover`) |
| D7 | P3 | Preview lightbox chrome text `#ece7dd`/`#9c958a` — cố ý dark-fixed (lightbox luôn tối); nên chuyển thành token cố định (`--lightbox-fg/muted`) cho tự ghi chú. | `Preview.tsx` | token cố định, không đổi theo theme |
| D8 | P3 | `--knob` trắng không có override dark (thumb switch rất chói trên track `--border` tối). | `index.css` | dark: knob `#d6d0c4`-ish |

## 2. i18n

| # | Sev | Vấn đề | Vị trí | Hướng sửa |
|---|-----|--------|--------|-----------|
| I1 | P1 | Demo replies (composeReply) toàn bộ tiếng Việt hardcode — boot EN vẫn trả lời tiếng Việt. | `services/chat.ts` | chuyển corpus vào seed bundle (`seed.vi/en.ts`) như đã làm với seed content |
| I2 | P1 | Preview demo document (PDF/CSV/MD nội dung giả) hardcode tiếng Việt. | `components/Preview.tsx` | đưa nội dung vào seed bundles, component chỉ render |
| I3 | P1 | Chuỗi lỗi service hardcode VN: `'Không kết nối được máy chủ'`, `'Lỗi …'`, `'Stream lỗi'`, `'Máy chủ không trả về stream'`. | `services/auth.ts`, `services/llm.ts` | `i18n.t('errors.…')` (service import i18n trực tiếp — tiền lệ persist.ts) |
| I4 | P1 | VM strings hardcode: `` `${n} luồng` `` (store 1862), fallback `'Chung'` (≈6 chỗ 1865–1894), provider name `'Trên máy của bạn'` (defs 130). | `store.tsx`, `defs.ts` | `t('project.threadCount', {count})`, `t('project.defaultName')`, provider name qua `t('provider.ollama.name')` |
| I5 | P2 | Email account hardcode `minh@aurora.studio` trong Settings — sau BE1 đã có session thật (`/v1/me`). | `SettingsDialog.tsx:257` | hiển thị email session (`v.userEmail`), fallback demo từ i18n |
| I6 | P2 | `index.html` `lang="vi"` tĩnh — sai khi user chạy EN (a11y/SEO). | `index.html` | sync `document.documentElement.lang` khi đổi ngôn ngữ (i18n `languageChanged`) |
| I7 | P3 | `en.json` demo persona `"Minh Trần"` giữ nguyên trong EN. | `i18n/en.json` | cân nhắc persona EN riêng |
| I8 | P3 | Tên file demo `'Khảo-sát.csv'` hardcode trong VM. | `store.tsx:1679` | lấy từ seed |

## 3. Responsive & touch (iOS · tablet · PC)

| # | Sev | Vấn đề | Vị trí | Hướng sửa |
|---|-----|--------|--------|-----------|
| R1 | P1 | iOS auto-zoom khi focus input: mọi input đang 13–15px (<16px). Nhắn tin trên iPhone sẽ bị zoom giật màn hình. | Composer textarea (text-lead OK ~18px) nhưng các input Settings/Auth/Rename 13–15px | media touch: input font-size ≥16px (`@media (pointer: coarse)`) |
| R2 | P1 | Hover-reveal actions không dùng được trên touch: nút «Tùy chọn cuộc trò chuyện» (Sidebar), actions message (trừ isLast), nút xóa file (ProjectConfig) chỉ hiện khi hover — iPad ở layout desktop không có hover. | `Sidebar.tsx`, `MessageView.tsx:354`, `ProjectConfigView.tsx:117` | `@media (hover: none)`: luôn hiển thị (opacity-100) |
| R3 | P1 | Thiếu `viewport-fit=cover` + không dùng `env(safe-area-inset-*)` — composer/drawer đè home-indicator trên iPhone, notch landscape ăn vào content. | `index.html`, shell/Composer/MobileDrawer | thêm viewport-fit + padding safe-area ở shell dưới/трái/phải |
| R4 | P2 | Không dùng `dvh`; html/body `height:100%` — iOS URL bar co giãn + bàn phím: cần verify động композer có bị che khi keyboard mở không. | `index.css` shell | `100dvh` cho shell + verify keyboard; cân nhắc `interactive-widget=resizes-content` |
| R5 | P2 | `overscroll-behavior` chưa đặt cho vùng chat scroll — pull-to-refresh/bounce kéo cả trang trên mobile web. | `ConversationView`, drawer, dialogs | `overscroll-contain` trên các scroll region |
| R6 | P3 | `.tap` (44px) chỉ áp khi ≤880px — iPad landscape (1024px+) vẫn là touch nhưng mất min target. | `index.css` | đổi điều kiện sang `(pointer: coarse)` |

## 4. Interaction patterns

| # | Sev | Vấn đề | Vị trí | Hướng sửa |
|---|-----|--------|--------|-----------|
| X1 | P2 | `scroll-smooth` trên vùng chat + auto-scroll khi stream từng token → scroll «đuổi» liên tục, cảm giác cao su, tốn frame. | `ConversationView.tsx:39` | scroll instant khi stream, smooth chỉ cho jump người dùng |
| X2 | P2 | Danh sách nút style/theme/focus trong Settings dùng `aria-pressed` + style inline — đúng; nhưng nhóm chúng là radio-group ngữ nghĩa (một lựa chọn) → nên `role="radiogroup"`/`aria-checked` hoặc giữ pressed nhất quán toàn app. | `SettingsDialog` General/Assistant | chuẩn hóa một pattern segmented control dùng chung |
| X3 | P2 | Sidebar row active không có `aria-current` — screen reader không biết conversation nào đang mở. | `Sidebar.tsx`, `MobileDrawer.tsx` | `aria-current="page"` cho row active |
| X4 | P3 | HoverCard token meter là `cursor-help` hover-only — trên touch không mở được chi tiết usage. | `TopBar.tsx` | Radix HoverCard đã hỗ trợ tap? verify; nếu không → Popover on click |

## 5. Active states

Nhìn chung ĐÃ tốt: `aria-pressed` cho toggle-buttons, `aria-selected` cho tabs,
check ✓ trong menus, `data-[highlighted]` (sau khi sửa D1 sẽ nhìn thấy ở dark).
Thiếu: X3 (aria-current), và **X2** (segmented control chưa có ngữ nghĩa nhóm).
Model switcher TopBar đã có width-reserve chống nhảy (invisible twin) — pattern
tốt, giữ.

## 6. Độ mượt / performance

| # | Sev | Vấn đề | Vị trí | Hướng sửa |
|---|-----|--------|--------|-----------|
| P1 | P1 | **Store context đơn khối**: mỗi keystroke draft → `set()` → toàn bộ `deriveValues` (VM ~700 field) tính lại + mọi consumer re-render (Sidebar, TopBar, MessageView…). Hiện chưa thấy lag rõ vì DOM nhỏ, nhưng là trần hiệu năng chính khi hội thoại dài. | `store.tsx` | đo trước (React Profiler); hướng: tách draft ra local state Composer, memo hóa slice VM, hoặc selector-based context |
| P2 | P2 | Resize listener `set({vw})` không throttle — bão re-render khi kéo cửa sổ. | `store.tsx:355` | rAF-throttle |
| P3 | P2 | Stream token → re-render cả path messages mỗi delta; Markdown + shiki parse lại block đang lớn dần. | `MessageView`, `Markdown.tsx` | verify Profiler; memo per-message (props bằng nhau bỏ qua), highlight defer đến khi fence đóng |
| P4 | P3 | `.grain` fixed overlay `mix-blend-mode` phủ toàn màn — cost compositing; đo trên máy yếu/mobile. | `index.css` | đo; nếu đắt → tắt trên mobile |

## 7. Flicker & layout shift

| # | Sev | Vấn đề | Vị trí | Hướng sửa |
|---|-----|--------|--------|-----------|
| F1 | P1 | **Google Fonts** stylesheet bên thứ ba + `display=swap` → FOUT nhảy layout lúc boot (Fraunces headline đổi metric rõ), phụ thuộc googleapis (trái nguyên tắc «chỉ Cloudflare + tự host»). | `index.html` | self-host qua `@fontsource/*` (OFL, bundle Vite, cache CF) + fallback metric tuning (`size-adjust`) |
| F2 | P2 | Theme init: nếu `.dark` áp SAU khi React mount (persisted theme đọc trong store) → flash trắng khi boot dark. | `main.tsx`/store boot | verify động; nếu flash → inline script đọc persisted theme đặt class trước paint |
| F3 | P2 | Lazy chunks (Settings/dialog) — kiểm tra fallback có gây nháy overlay khi mở lần đầu. | routes/dialogs lazy | verify động |
| F4 | P3 | `viewIn` translateY(6px) mỗi lần đổi view — chủ ý (paper turn), giữ; đảm bảo không áp khi chỉ đổi params nhỏ. | `index.css` | review usage |

## Trạng thái (2026-07-02, cuối ngày)

- ✅ **Batch A** `bb848c2` — D1–D8 xong (token hover/scrim/badge/knob; social hover:bg-white xử lý ở e00b210).
- ✅ **Batch B** `0260887` — I1–I8 xong (corpus/preview vào seed, errors.*, userEmail thật, html lang).
- ✅ **Batch C** `00600b0` — R1, R2, R3, R5, R6, X4 xong. **R4 (dvh/keyboard iOS) còn mở** — cần verify trên thiết bị thật.
- ✅ **Batch D** `a8c0102` — X1 (bỏ scroll-smooth), X2 (role=group), X3 (aria-current + e2e proof).
- ✅ **Batch E** `a143b6f` — F1 (fonts self-host @fontsource + e2e zero-CDN proof), F2 (pre-paint theme script). **F3 (lazy-chunk flash) còn mở** — verify động.
- **Batch F**: P2 (rAF-throttle resize) ✓ commit kế tiếp; P1/P3/P4 CẦN ĐO (React Profiler + máy yếu) trước khi tối ưu — chưa làm.
- Ngoài audit: **RP1** `eeb9483` (demo quarantine /demo) + **RP2** `e00b210` (auth gate thật) đã ship — xem docs/real-product-plan.md.

## Kế hoạch xử lý (batch, mỗi batch qua gate + commit riêng)

- **Batch A — Dark mode tokens (D1–D8)**: thêm `--hover-1/2`, `--scrim*`,
  `--border-hover`, knob dark; quét sạch màu hardcode; verify e2e screenshot
  light/dark từng surface. *(điểm user báo: dropdown + settings nằm ở đây)*
- **Batch B — i18n (I1–I8)**: dời corpus demo vào seed, error strings qua
  i18n, VM strings qua `t()`, lang attribute động.
- **Batch C — Touch/iOS (R1–R6, X4)**: input ≥16px, hover-reveal → luôn hiện
  trên `hover: none`, safe-area + viewport-fit, dvh, overscroll.
- **Batch D — Interaction & a11y (X1–X3)**: scroll strategy khi stream,
  aria-current, segmented control ngữ nghĩa.
- **Batch E — Fonts self-host (F1) + boot flash (F2, F3)**.
- **Batch F — Performance (P1–P4)**: đo Profiler trước, tối ưu theo số liệu.

Sau mỗi batch: cập nhật bảng này (✅ + commit hash). Coverage ≥90% branches
chốt sau cùng (đã thống nhất với user).

## Ghi chú roadmap (quyết định product 2026-07-02)

- **Seed → kịch bản thật trong DB**: khi đủ mọi tính năng thể hiện được UI
  (files thật, share, tool-calls thật…), chuyển demo seed bundles thành
  kịch bản ghi VÀO op-log của user đầu tiên của app (dogfood chính hệ
  thống sync/DO thay vì content giả client-side). Làm SAU khi
  feature-complete — đến lúc đó seed.vi/en.ts trở thành script seeding,
  không phải runtime data.
