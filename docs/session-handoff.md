# Session handoff — 2026-07-02 (kết phiên BE3 T2–T5)

Đọc file này ĐẦU TIÊN ở session kế. Trạng thái repo, quyết định đã chốt,
TODO theo thứ tự, và bẫy đã cắn.

## Trạng thái repo

- **CI XANH** (gates + e2e; xanh từ `983b7da` sau khi sửa hermetic
  tests). Push thẳng main, mỗi commit kèm "Verified:".
- Web: 371 unit (44 file, projects song song `npm run test`) + 18 e2e ·
  coverage floors **94/90/94/95** (branches vừa nâng 90, ĐỪNG hạ).
- Dev local: web `npm run dev` (:5173); api `cd apps/api && npx wrangler
  dev --port 8787` (session bash `dev`; **restart wrangler sau khi đổi
  `.dev.vars`**). D1 local đã migrate tới `0001` (provider_credential).
  Test user: `minh@test.vn / matkhau-manh-123`.
- `.dev.vars` (gitignored): BETTER_AUTH_SECRET, R2/CF-Images creds,
  `CREDENTIALS_KEY` (base64 32B — dev only, prod sẽ `wrangler secret put`).

## Đã ship phiên này (mới → cũ)

| Commit | Gì |
|---|---|
| `8e8d265` | fix coverage floor + de-flake credential hydrate |
| `2fc8b11` | **T5**: client server-profiles, migration 1-lần, chat bằng credentialId |
| `5c5a454` | **T3+T4**: /v1/credentials CRUD + proxy resolve credentialId |
| `2862c1c` | **T2**: AES-256-GCM envelope + bảng provider_credential |
| `983b7da` | hermetic unit tests (isolate:true + fetch 503 stub) — CI xanh lần đầu |
| trước đó | RP1/RP2 (demo quarantine + auth gate), audit batches A–E, fonts self-host, coverage 90, test pipeline song song |

## QUYẾT ĐỊNH ĐÃ CHỐT (không tái tranh luận)

- BYOK server-side sealed là source of truth; inline profile chỉ còn là
  đường transitional cho local rows chưa migrate.
- Real product: auth gate bắt buộc (như ChatGPT); demo ở `/demo`.
- Hạ tầng: Cloudflare-only + OSS tự host. LLM provider BYOK là ngoại lệ.

## TODO — thứ tự đề xuất session kế

1. **T6 — adapters còn lại**: `providers/gemini.ts`, `providers/openai.ts`,
   `providers/ollama.ts` (SSE → Nova contract như anthropic.ts, test
   stub-fetch cùng pattern) + mở `parseChatRequest` khỏi hard-code
   'claude' + client bỏ điều-kiện-chỉ-claude trong streamReply
   (`ref.providerId === 'claude'` tại ~store.tsx:600).
2. **T8 — usage events → Analytics Engine**: binding wrangler + ghi
   {userId, providerId, modelId, inTok, outTok} mỗi message_stop trong
   proxy; client đọc tổng qua endpoint mới thay vì chỉ localStorage.
3. **OAuth social (Google/GitHub) cho login app**: Better Auth có sẵn —
   cần user cấp OAuth app credentials (hỏi khi bắt đầu).
4. BE4 (R2 files/share) → BE5 (rate-limit KV, observability, deploy:
   `wrangler d1 create nova` thật + secrets prod).
5. Còn mở từ audit: R4 (iOS keyboard — cần thiết bị thật), F3
   (lazy-chunk flash), P1/P3/P4 (profiling trước khi tối ưu store/
   Markdown/grain).
6. Nhắc user: rotate R2/CF-Images token khi ổn định; dismiss Dependabot
   esbuild (accepted-risk đã ghi doc); nâng actions lên Node 24 runner
   (annotation deprecation trong CI).

## BẪY ĐÃ CẮN — đọc trước khi gõ lệnh

- **`; echo "$?" && git commit` nuốt exit code** → commit lọt khi gate
  đỏ (đã xảy ra ở 2fc8b11). Luật: MỌI gate nối commit bằng MỘT chuỗi
  `&&` thuần. Ability `pipestatus-gate` v2 có case này.
- **`isolate:false` + `vi.mock` = mock chết cross-file trên CI ít core**
  — đừng bao giờ bật lại isolate:false cho suite có module-mock.
- Unit tests **hermetic**: setup.ts stub fetch 503 mỗi beforeEach; test
  cần fetch riêng tự stub trong thân test. KHÔNG BAO GIỜ để unit chạm
  wrangler thật (từng che giấu CI đỏ suốt nhiều commit).
- `mockResolvedValueOnce` cho data mà effect hydrate đọc = flaky khi
  effect chạy 2 lần — dùng `mockResolvedValue` (sticky) trừ khi test
  đúng số lần gọi.
- store: `deriveValues` KHÔNG có `sRef` (dùng `s`); effect gọi async
  hydrate → bọc `queueMicrotask` (setTimeout(0) gây flaky, gọi thẳng
  bị lint no-sync-setState).
- Node-env test file KHÔNG có localStorage — file test service đọc
  localStorage phải chạy happy-dom (bỏ docblock node).
- wrangler dev không tự nạp `.dev.vars` mới — restart.
- Token curl smoke: `grep -i "^set-auth-token" | head -n 1 | tr -d
  '\r\n'` (nhiều dòng header → header invalid).
- gh CLI: `gh run watch` ngay sau push bắt nhầm run cũ — sleep 15–30s
  rồi lấy run theo headSha.

## Số liệu gate hiện hành

- typecheck 0 · lint 0 · unit 371/371 (`npm run test`, ~25s) · e2e 18/18
  (~8s) · coverage web 95.52/90.29/94.86/97.09 · build sạch.
- Lệnh chuẩn trước commit:
  `npm run typecheck && npm run lint && npm run test && npm run build && git commit …`
  (e2e + coverage thêm khi chạm UI/logic tương ứng).
