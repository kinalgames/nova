# Session handoff — 2026-07-03 (kết phiên T6 multi-provider)

Đọc file này ĐẦU TIÊN ở session kế. Trạng thái repo, quyết định đã chốt,
TODO theo thứ tự, và bẫy đã cắn.

## ĐÃ DEPLOY — Cloudflare Workers (2 env, mỗi env 1 Worker serve web + API)

- **dev**: https://nova-dev.kinalgames.workers.dev · **prod**: https://nova.kinalgames.workers.dev
  (custom domain dự kiến: nova.kinal.co — khi gắn: thêm route, đổi 2 vars
  BETTER_AUTH_URL/WEB_ORIGIN trong wrangler.jsonc, thêm redirect URI OAuth)
- Same-origin: Workers Static Assets serve `apps/web/dist` (SPA fallback),
  `run_worker_first: /v1/* /api/* /healthz`. Client prod build `API_BASE=''`.
- Deploy: `npm run build --workspace=@nova/web && cd apps/api && npx wrangler
  deploy --env dev|production`. Migrations: `npx wrangler d1 migrations apply
  DB --remote --env …`. D1: nova-dev `54de4c43…` / nova `65f66b6c…`.
- Secrets đã nạp per env: BETTER_AUTH_SECRET, CREDENTIALS_KEY (random riêng
  từng env), GEMINI_OAUTH_*, GOOGLE_CLIENT_*, GITHUB_CLIENT_* (app riêng
  per env). CÒN THIẾU: AE_SQL_TOKEN + CF_ACCOUNT_ID (/v1/usage read-back).
- **AE binding đang tạm comment trong wrangler.jsonc** — chờ user bấm enable
  Analytics Engine trong dashboard; xong thì bỏ comment 2 dòng + redeploy.
- Social login: Google (1 client, 3 redirect URI) + GitHub (3 app riêng).
  Flow: redirect về /login → client adoptSocialSession() đổi cookie → bearer
  qua GET /v1/session-token → reload vào app. Local social cần đăng nhập
  cùng origin (cookie SameSite) — test trên cloud là chính.
- CI auto-deploy dev: CHƯA — cần user tạo CF API token (Workers Scripts:Edit)
  đặt vào GH secrets rồi thêm workflow.

## Trạng thái repo

- **CI XANH** (gates + e2e). Push thẳng main, mỗi commit kèm "Verified:".
- Web: 347 unit web + 64 api + 9 shared = **420 unit** (50 file, projects
  song song `npm run test`) + 18 e2e · coverage floors web **94/90/94/95**
  (branches sát floor, ĐỪNG hạ). CI xanh: 48723de (T6) + 7d90981 (T8).
- Dev local: web `npm run dev` (:5173); api `cd apps/api && npx wrangler
  dev --port 8787` (session bash `dev`; **restart wrangler sau khi đổi
  `.dev.vars`**). D1 local đã migrate tới `0001` (provider_credential).
  Test user: `minh@test.vn / matkhau-manh-123`.
- `.dev.vars` (gitignored): BETTER_AUTH_SECRET, R2/CF-Images creds,
  `CREDENTIALS_KEY`, `GEMINI_OAUTH_CLIENT_ID/SECRET` (cặp công khai
  gemini-cli), `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
  (app nova-local). Tất cả đã điền sẵn local.

## Đã ship phiên này

- **T8 — usage → Analytics Engine**: proxy tap mỗi message_stop →
  datapoint `nova_usage` {blobs: provider/model/kind, doubles: in/out,
  index: userId} (`apps/api/src/usage.ts`); chỉ meter khi có session.
  `GET /v1/usage` đọc tháng hiện tại qua AE SQL REST (cần
  `CF_ACCOUNT_ID` + `AE_SQL_TOKEN` — chưa cấu hình → 501, client tự
  fallback roll-up local). Client hydrate cùng nhịp credentials;
  Settings→Providers ưu tiên tổng server (cross-device). LƯU Ý: local
  dev AE binding là no-op — đọc-back chỉ test được trên prod thật.
- **T6 — multi-provider adapters**: `/v1/chat` dispatch registry
  (`apps/api/src/providers/index.ts`) cho cả 4 provider; client hết
  điều-kiện-chỉ-claude (store.tsx dùng `ref.providerId`). Chi tiết wire
  format từng adapter: docs/backend-architecture.md mục BE3/T6.
  - gemini api_key: `x-goog-api-key` → generativelanguage `?alt=sse`.
  - gemini account (EXPERIMENTAL, transport của gemini-cli): nhận access
    token (ya29…) / refresh token (1//…) / nguyên blob
    `~/.gemini/oauth_creds.json` (ƯU TIÊN refresh token — access token
    chết sau 1h). Flow: refresh (OAuth client lấy từ env
    GEMINI_OAUTH_CLIENT_ID/SECRET — thiếu → 400 invalid_credential)
    → `loadCodeAssist` lấy project → cloudcode-pa stream (chunk bọc
    `{response:…}`, transform unwrap cả hai dạng). Account chưa onboard
    Code Assist → 412 bảo chạy gemini-cli login một lần.
  - openai: Bearer key → Chat Completions, `max_completion_tokens`
    (KHÔNG max_tokens — gpt-5/o-series reject), usage qua
    `stream_options.include_usage`.
  - ollama: credential = endpoint URL (http/https, sai → 400
    `invalid_credential`); NDJSON `/api/chat`. Localhost endpoint chỉ
    chạy khi api dev cùng máy — Worker prod không thấy localhost user.
  - Ma trận auth kind: `providerAuth` trong `@nova/shared/contracts` —
    single source cho client add-menu + proxy validation (account chỉ
    claude/gemini).

## QUYẾT ĐỊNH ĐÃ CHỐT (không tái tranh luận)

- BYOK server-side sealed là source of truth; inline profile chỉ còn là
  đường transitional cho local rows chưa migrate.
- Real product: auth gate bắt buộc (như ChatGPT); demo ở `/demo`.
- Hạ tầng: Cloudflare-only + OSS tự host. LLM provider BYOK là ngoại lệ.
- Account-kind = transport của CLI chính chủ (Claude Code / gemini-cli),
  EXPERIMENTAL, chỉ chạy trên subscription/account CỦA user.

## USER SẼ TEST KHI DẬY — auth gemini & openai

1. Chạy `wrangler dev` (:8787) + `npm run dev` (:5173), đăng nhập.
2. Gemini 「Khóa API」: dán key AIza… → Test → chat (slot trỏ
   gemini-2.5-flash).
3. Gemini 「Tài khoản」: dán NGUYÊN nội dung `~/.gemini/oauth_creds.json`
   (đã từng `gemini` login trên máy đó). Access token trần cũng chạy
   nhưng hết hạn sau 1h.
4. OpenAI: dán key sk-… → Test → chat gpt-5-mini (rẻ nhất).
5. Lỗi upstream hiện nguyên văn trong bubble (⚠ code: detail) — đủ để
   chẩn đoán key sai/quota.

## TODO — thứ tự đề xuất session kế

1. **OAuth social (Google/GitHub) cho login app**: Better Auth có sẵn —
   cần user cấp OAuth app credentials (hỏi khi bắt đầu).
2. BE4 (R2 files/share) → BE5 (rate-limit KV, observability, deploy:
   `wrangler d1 create nova` thật + secrets prod gồm CREDENTIALS_KEY,
   GEMINI_OAUTH_*, CF_ACCOUNT_ID + AE_SQL_TOKEN cho /v1/usage).
3. Ollama client-direct path (endpoint localhost không reach được từ
   Worker prod — cân nhắc fetch thẳng từ browser khi provider=ollama).
4. Còn mở từ audit: R4 (iOS keyboard — cần thiết bị thật), F3
   (lazy-chunk flash), P1/P3/P4 (profiling trước khi tối ưu store/
   Markdown/grain).
5. Nhắc user: rotate R2/CF-Images token khi ổn định; dismiss Dependabot
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
- `vi.fn(async () => …)` không tham số → `mock.calls[0][0]` lỗi TS2493
  (tuple rỗng) — khai tham số `(_url: string)` hoặc cast calls.
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

- typecheck 0 · lint 0 (5 warnings pre-existing trong store.tsx) ·
  unit 420/420 (`npm run test`, ~25s) · e2e 18/18 (~9s) · coverage web
  trên floors · build sạch.
- Lệnh chuẩn trước commit:
  `npm run typecheck && npm run lint && npm run test && npm run build && git commit …`
  (e2e + coverage thêm khi chạm UI/logic tương ứng).
