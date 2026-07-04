# RP — Real Product plan (2026-07-02)

> **HOÀN TẤT & VƯỢT KẾ HOẠCH (2026-07-04)**: demo mode đã bị XÓA HOÀN
> TOÀN khỏi sản phẩm (không còn `/demo/*`); test suite chạy trên fixture
> thật (`src/test/showcase.ts`). Tài liệu này giữ làm archive của giai
> đoạn chuyển đổi — các mục nói về `/demo` mô tả trạng thái ĐÃ QUA.

**Goal**: app mặc định là sản phẩm thật (auth bắt buộc, boot sạch, không nội
dung giả); toàn bộ kịch bản demo sống ở route riêng `/demo/*`; khi
feature-complete thay demo bundle bằng DB seeder (op-log của user đầu tiên).

**Architecture**: một StoreProvider ở `__root.tsx` phục vụ cả hai thế giới.
`isDemo` suy từ pathname (`/demo…`). Demo dùng persist namespace riêng
(`nova.flow.demo.v5`) + seed bundle + fake streaming; real dùng
`nova.flow.settings.v5` + boot tối thiểu + chỉ provider thật. Auth gate chặn
`_app` tree bằng `beforeLoad` (token local, không network) — `/demo`, `/login`,
`/signup`, `/onboarding` công khai.

**Quyết định đã chốt với user** (không tái tranh luận):
- Hybrid: `/demo/*` ngay bây giờ; RP3 seeder khi feature-complete.
- Real app bắt buộc đăng nhập như ChatGPT/Claude.

**Ràng buộc**:
- Không đổi semantics test hiện có: unit + e2e UI chuyển sang chạy trong demo
  world (nội dung y hệt hôm nay).
- Copy mới bắt buộc qua `t()` (vi + en).
- Coverage floors 94/87/94/95 giữ nguyên (nâng branch ≥90 là task riêng sau RP).

## RP1 — Demo quarantine (route tree `/demo/*`)

### RP1.1 `state/persist.ts` — persist key theo mode
- Thêm `export const DEMO_PERSIST_KEY = 'nova.flow.demo.v5'` cạnh
  `PERSIST_KEY`; export `persistKeyFor(demo: boolean)`.
- Migrations (v4→v5) áp cho cả hai key (hàm load đã nhận raw string — chỉ cần
  gọi với key đúng).

### RP1.2 `state/store.tsx` — mode-aware boot
- `const isDemo = pathname === '/demo' || pathname.startsWith('/demo/')`
  (tính trong StoreProvider, cạnh `pathToView`).
- `pathToView`: normalize trước khi match:
  `const p = pathname.replace(/^\/demo(?=\/|$)/, '') || '/'`.
- `initialState(p, { demo })`:
  - demo → seed từ `getSeed()` (như hôm nay).
  - real → tối thiểu: 1 project mặc định
    `{ id: 'chung', name: i18n.t('projects.defaultName'), isDefault: true }`,
    `conversations: []`, `threads: {}`, `profiles` rỗng cho 4 provider,
    KHÔNG projectFiles demo, KHÔNG demo profiles.
- Đọc/ghi localStorage bằng `persistKeyFor(isDemo)` (boot + persist effect +
  sync chỉ chạy khi `!isDemo`).
- Navigate helper prefix: `const go = (to: string, params?: object) =>
  navigate({ to: (isDemo ? '/demo' + to : to) as never, params })` — thay mọi
  `navigate({ to: '/chat/$convId' | '/new' | '/projects…' })` trong store bằng
  `go()`. `/login`, `/signup`, `/onboarding` KHÔNG prefix.
- VM: expose `isDemo`, `exitDemo: () => navigate({ to: '/' })`.

### RP1.3 route files mới (thin re-exports, mirror `_app.*`)
| File | Nội dung |
|---|---|
| `routes/demo.tsx` | layout `/demo` — copy AppLayout của `_app.tsx` (Sidebar/TopBar/footer/Outlet) |
| `routes/demo.index.tsx` | redirect như `_app.index.tsx` nhưng đọc `DEMO_PERSIST_KEY`, đích `/demo/chat/$convId` |
| `routes/demo.new.tsx` | render HomeView (như `_app.new.tsx`) |
| `routes/demo.chat.$convId.tsx` | như `_app.chat.$convId.tsx`, bounce về `/demo/new` |
| `routes/demo.projects.index.tsx` · `demo.projects.$projectId.index.tsx` · `demo.projects.$projectId.config.tsx` | render các view projects tương ứng |
- Fake streaming (`composeReply`) chỉ chạy khi `isDemo` (điều kiện thêm vào
  nhánh routing trong `streamReply`); real mode không bao giờ fake.
- TopBar: chip `DEMO` + nút thoát (`v.isDemo`), copy `t('demo.badge')`,
  `t('demo.exit')`.

### RP1.4 tests theo demo world
- `test/util.tsx` `renderApp/renderStore`: history khởi tạo tại `/demo`
  (memory history entry `/demo`), giữ nguyên mọi assertion nội dung.
- e2e: mọi spec UI `goto('/')` → `goto('/demo')` (và deep-link
  `/demo/chat/c1`…).

## RP2 — Auth gate + real boot UX

### RP2.1 gate
- `routes/_app.tsx`:
  ```ts
  import { redirect } from '@tanstack/react-router'
  import { getToken } from '../services/auth'
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/login' })
  }
  ```
  (token-only, không network — offline vẫn vào được app local-first).
- `routes/login.tsx|signup.tsx`: đã đăng nhập (`getToken()`) → redirect `/`.
- Login/Signup page thêm link `t('auth.tryDemo')` → `/demo`.

### RP2.2 account-switch guard (chống trộn dữ liệu local giữa 2 tài khoản)
- Persist thêm `accountId?: string`. Sau `fetchMe()` thành công trong
  `submitAuth`: nếu `persisted.accountId` tồn tại và ≠ `me.id` → reset state
  local (như `clearAllData` nhưng giữ theme/lang) TRƯỚC khi `triggerSyncHydrate`
  (op-log của account mới sẽ đổ về). Set `accountId: me.id`.

### RP2.3 empty states (real boot)
- Sidebar không có conversation → khối hint `t('sidebar.emptyHint')` +
  CTA `t('sidebar.emptyCta')` (mở `/new`).
- `_app.index.tsx`: không có conversation persisted → redirect `/new`
  (thay fallback `c1`).
- Composer send khi KHÔNG có profile thật cho provider của slot →
  không gửi, toast `t('composer.needProvider')` + mở Settings tab providers
  (`openSettings('providers')`).
- Settings providers: trạng thái 0 profile đã render đúng (form add có sẵn) —
  chỉ cần rà copy.

### RP2.4 e2e cho RP
- spec mới `gate.spec.ts`: `goto('/')` không token → URL `/login`;
  login page có link demo; `goto('/demo')` vào thẳng demo shell.
- CI không cần API server (gate token-only; demo specs không auth).

## RP3 — DB seeder (SAU feature-complete; đã ghi ở ui-ux-audit.md)
- `seed.vi/en.ts` trở thành input cho script ghi kịch bản vào op-log
  (`POST /v1/sync`) của tài khoản demo/first-user; `/demo` route sau đó có thể
  đọc từ server thay vì bundle. Không làm bây giờ.

## Thứ tự thực thi & proof
1. RP1.1→RP1.4 một commit (`feat(demo): quarantine the showcase under /demo`),
   proof: unit 304 pass (demo world), e2e cập nhật pass, real boot thủ công =
   sạch.
2. RP2.1→RP2.4 một commit (`feat(auth): the real app requires a session`),
   proof: e2e gate spec, unit store.auth cập nhật, smoke login thật với
   wrangler dev.
3. Cập nhật `docs/feature-roadmap.md` + `ui-ux-audit.md` trạng thái.
