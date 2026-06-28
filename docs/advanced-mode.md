# Tinh gọn chế độ Advanced ↔ Basic

> Trạng thái: **T1–T8 đã triển khai xong trên demo** — 152 test xanh, coverage đạt ngưỡng (stmt 95.5 / branch 91.2 / func 96.3 / lines 97.4). Renderer block-grouping thật vẫn deferred.
> Branch: `feat/advanced-mode-streamline` · Base: `3e673b1`.

## Mục tiêu
Thu hẹp khoảng cách giữa "Chế độ nâng cao" và chế độ mặc định: gộp hầu hết khác
biệt thành một giao diện thân thiện duy nhất, chỉ giữ lại **một lớp chi tiết kỹ
thuật** (trace tool/thinking) bật/tắt bằng toggle, và bộc lộ chi tiết token theo
yêu cầu (hover) thay vì nhân đôi nhãn.

## Kiến trúc
Cờ `advanced` được giữ nhưng đổi nghĩa = *"chế độ chuyên nghiệp: hiện chi tiết kỹ
thuật trong từng bước trace"*. Mọi nhãn song ngữ kỹ thuật/thân thiện (nhóm B) bị
xoá nhánh, còn lại một wording thân thiện. Các tính năng bị khoá nhầm (nhóm C) mở
cho mọi người. Inspector panel bị bỏ vì chain‑summary inline (pill `traceSummary`)
đã thay thế. Chi tiết token chuyển sang Radix Popover trên meter.

## Tech stack
React 19 · TypeScript strict · Zustand‑style store (`useStore` → view‑model `v`) ·
Tailwind v4 (utility classes; design tokens via `@theme inline`) · Radix UI · Vitest + Testing Library · Playwright.

## Global constraints — wording (copy verbatim)
| Khoá | Giá trị duy nhất |
|---|---|
| Description card | `Chế độ dành cho người dùng chuyên nghiệp. Bật để xem thêm chi tiết kỹ thuật trong từng bước.` |
| Meter label | `bộ nhớ` |
| Meter percent | `còn 58%` |
| Token detail (hover) | `84k / 200k token · còn 58%` |
| Menu model — tiêu đề | `CHẾ ĐỘ TRỢ LÝ` |
| Mô tả model A | `Opus 4.8 · trả lời sâu` |
| Mô tả model B | `Haiku 4.8 · phản hồi nhanh` |
| Đang stream | `Nova đang tra cứu và tính toán…` |
| Hoàn tất | `Nova đã tra cứu web và cập nhật tài liệu của bạn` |
| Caret trace (đóng) | `Xem Nova đã làm gì` |
| Nút Bash | `Chạy lệnh` |

---

## Phần A — Spec (quyết định đã chốt)

### A1. Cơ chế
- Giữ cờ `advanced` (persist localStorage). Toggle ở Settings, tên **giữ nguyên**
  "Chế độ nâng cao", description theo bảng trên.
- **Default = advanced ON** (tạm thời cho giai đoạn build full‑detail). ⚠️ Đây là
  default tạm; sẽ hoà giải lại với định danh "pro mode = opt‑in" khi thiết kế bản
  basic/condensed (xem Open threads).

### A2. Trace hội thoại (advanced ON = đúng ảnh tham chiếu)
- Pill `traceSummary` = chain summary. Quy tắc sinh ở deploy thật: *text đầu của
  Nova + theo sau ≥2 tool_use* → lấy text đó; thiếu → fallback meta
  `Đã dùng N công cụ · Xs`. (Demo giữ chuỗi hiện có.)
- **Bỏ nhãn "SUY NGHĨ"** — thinking chỉ còn node gạch + dòng italic.
- Mỗi step: dòng thân thiện luôn hiện; chip/code/snippet/err **inline khi
  advanced ON** (không popover).
- Bản advanced‑OFF (condensed) = **DEFERRED**.

### A3. Stream state
- Thay text trạng thái bằng **animation logo Nova** ("đang suy nghĩ và làm việc"),
  tôn trọng `prefers-reduced-motion`. Xong → pill (icon `focus`→`check`).

### A4. Đồng nhất text → giọng thân thiện
- Xoá mọi nhánh `adv ? … : …` cho nhãn ở §Global constraints.

### A5. Promote cho mọi người
- Chip công cụ trên mỗi kỹ năng (Nova view).
- Thanh phím tắt dưới cùng: gỡ điều kiện `advanced`, chỉ còn toggle riêng `barOn`.

### A6. Bỏ
- **Inspector panel** + nút mở/đóng + state liên quan.

### A7. Giữ gated sau advanced
- Hàng "Thêm nhà cung cấp tùy chỉnh (OpenAI‑compatible)" trong Settings.

### A8. Token disclosure
- Meter mặc định `bộ nhớ · còn 58%`; **hover/tap meter → Popover** hiện token số.

---

## Phần B — Kế hoạch thực thi (T1…T8)

Quy ước mỗi task: TDD (red → green → refactor), commit nhỏ. Lệnh kiểm chứng:
`npm run typecheck` · `npm test` · `npm run lint`.

### T1 — Default = advanced ON + description card
- **Files:** `src/state/store.tsx` (L75), `src/views/SettingsView.tsx` (L21),
  `src/state/store.more.test.tsx` (L38), `src/state/store.test.tsx`.
- **Steps:**
  1. `store.tsx:75` đổi `advanced: p.advanced ?? false` → `?? true`.
  2. `SettingsView.tsx:21` đổi nội dung mô tả thành chuỗi Description card.
  3. Sửa test: `store.more.test.tsx:38` `expect(...advanced).toBe(false)` → `true`
     (và logic toggle theo đó); rà `store.test.tsx` các assert default.
- **Verify:** `npm test src/state` xanh; mở app thấy trace mở sẵn detail.

### T2 — Đồng nhất text (bỏ nhánh `adv`)
- **Files:** `src/state/store.tsx` (L651, 655, 656, 662, 673–678, 679, 838, 882).
- **Steps:** thay từng ternary `adv ? … : …` bằng hằng thân thiện ở §Global
  constraints. Riêng token: giữ chuỗi `84k / 200k` thành field mới `tokenDetail`
  (cho Popover T8), `tokenLabel`/meter percent = `còn 58%`.
- **Verify:** grep `adv ?` trong store chỉ còn các nhánh *hành vi* (showBar, toggle
  visuals), không còn nhánh *nhãn text*. `npm test` xanh.

### T3 — Bỏ nhãn "SUY NGHĨ"
- **Files:** `src/views/ConversationView.tsx` (L148).
- **Steps:** xoá `{v.advanced && <div…>SUY NGHĨ</div>}`. Giữ node gạch + italic.
- **Verify:** test trace không còn tìm "SUY NGHĨ"; thinking vẫn render.

### T4 — Promote chip kỹ năng + thanh phím tắt
- **Files:** `src/state/store.tsx` (L449 `showTools`, L841 `showBar`),
  `src/views/SettingsView.tsx` (L101), `src/views/views.test.tsx` (L31–36).
- **Steps:**
  1. `showTools: adv && p.tools.length > 0` → `p.tools.length > 0`.
  2. `showBar: … && adv && …` → bỏ `adv`, giữ `barOn && !quiet && isDesktop`.
  3. `SettingsView.tsx:101` bỏ `{v.advanced && (`…`)}` quanh ToggleRow phím tắt.
  4. `views.test.tsx`: bỏ `advanced: true` khỏi test chip kỹ năng.
- **Verify:** chip kỹ năng + hàng toggle phím tắt hiện khi advanced OFF.

### T5 — Xoá Inspector
- **Files:** xoá `src/components/Inspector.tsx`; `src/state/store.tsx`
  (L77 `inspector`, L692 `inspectorInline`, L693 `showReopen`, L694
  `toggleInspector`); `src/state/types.ts` (L71 `inspector`);
  `src/views/ConversationView.tsx` (import L4, panel L45–56 + nút reopen);
  test: `src/views/coverage-boost.test.tsx` (L29–), `src/views/views.test.tsx`
  (L58–59), `src/state/store.coverage.test.tsx` (L90–94).
- **Steps:** gỡ tuần tự, chạy `npm run typecheck` đến khi sạch tham chiếu.
- **Verify:** typecheck + test xanh; không còn panel/nút Inspector.

### T6 — Token: meter hover Popover
- **Files:** thêm dep `@radix-ui/react-popover`; mới `src/components/TechHint.tsx`
  (Popover: tap + hover‑intent, a11y); `src/components/TopBar.tsx` (bọc meter);
  `src/state/store.tsx` (`tokenDetail`).
- **Steps:**
  1. `npm i @radix-ui/react-popover`.
  2. Viết `TechHint` (trigger = children, content = `tokenDetail`), reduced‑motion.
  3. Bọc meter trong TopBar bằng `TechHint`.
- **Verify:** hover/tap meter hiện `84k / 200k token · còn 58%`; test mobile (tap)
  + keyboard mở được.

### T7 — Animation thinking của Nova (stream)
- **Files:** `src/views/ConversationView.tsx` (L123 "· đang trả lời", `StreamBlock`),
  `src/index.css` (tái dùng `pulseRing`/`breathe`, thêm keyframe nếu cần).
- **Steps:** thay text trạng thái stream bằng mark Nova có animation; ẩn khi
  `prefers-reduced-motion: reduce`.
- **Verify:** stream hiện animation; reduced‑motion thì tĩnh.

### T8 — Dọn test + README
- **Files:** `README.md` (L71), `src/state/store.coverage.test.tsx` (L385 nhánh
  advanced chết), các test coverage liên quan.
- **Steps:** viết lại README L71 (reveal + relabel‑gộp + promote shortcuts); xoá
  test nhánh advanced không còn tồn tại; chạy coverage giữ ngưỡng.
- **Verify:** `npm run test:coverage` đạt ngưỡng; `npm run lint` sạch.

### Thứ tự & phụ thuộc
`T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8`. T6 cần dep mới; T5 nên xong trước T6
(token rời khỏi Inspector). T3/T4/T7 độc lập tương đối.

---

## Open threads (chưa chốt — ghi để không quên)
1. **Default mode**: tạm ON; phải hoà giải với "pro mode = opt‑in" khi làm bản basic.
2. **Bản basic/condensed** (advanced OFF): thiết kế riêng sau, cần cái nhìn toàn cảnh.
3. **Renderer block‑grouping thật** cho deploy: pha sau; có thể cherry‑pick từ
   commit đã drop `6a4427e` (còn trong reflog).
4. **Junk uncommitted ở `main`**: `src/components/Inspector.tsx` có sửa rác
   `test s2c` (không phải của chúng ta) — nên discard vì Inspector đằng nào cũng xoá.
