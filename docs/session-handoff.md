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

## BACKLOG ĐẦY ĐỦ (kiểm kê 2026-07-03; OAuth social + deploy ĐÃ XONG)

Backend:
- ~~BE4 share /share/:id~~ ĐÃ XONG 2026-07-03 (user duyệt: unlisted + snapshot tĩnh + revoke + ẢNH THẬT): bảng D1 share (id random unguessable = credential, snapshot JSON, file_ids whitelist ownership-verified lúc tạo; migration 0003 applied 3 DB) · POST/DELETE /v1/shares (session) · GET /v1/shares/:id + /:id/files/:fileId (PUBLIC, chỉ serve file trong whitelist, nosniff) · client: menu Share tạo/copy link thật + Huỷ chia sẻ, share chết theo delConv + account-delete cascade · trang /share/:id trần (Markdown + ảnh public + CTA, noindex meta).
- ~~B1 R2 upload~~ ĐÃ XONG 2026-07-03 (scope user duyệt: upload+vision,
  share đợt sau): R2 binding `ATTACH` (bucket nova-attachments{-dev},
  key `att/{uid}/{id}`) + D1 bảng `attachment` (migration 0002, đã
  apply local+dev+prod) · `POST/GET /v1/files` (whitelist ảnh≤5MB
  png/jpg/webp/gif, pdf/text≤10MB, max 4 file/msg, owner-check qua D1)
  · `ChatTurn.attachments[{id}]` → server resolve (attachments.ts:
  text-fence vào content, ảnh/PDF thành base64 parts, budget 18MB từ
  turn mới nhất, thiếu/quá budget → note) · adapters: claude
  image/document blocks, gemini inline_data, openai image_url data-URL
  + PDF note, ollama note · client: upload XHR progress
  (services/upload.ts), pill progress/error trong Composer, send đợi
  upload xong, ảnh thật trong message (objectURL + fetch bearer theo
  fileId sau reload). CHẬY qua /v1/chat nên hưởng sẵn RL + metering.
  Còn lại của track này: BE4 share `/share/:id` (đợt sau).
- ~~B3 Rate-limit~~ ĐÃ XONG 2026-07-03: Workers Rate Limiting binding
  GA (key `ratelimits`, wrangler ≥ 4.36) — RL_AUTH 10/60s · RL_CHAT
  30/60s · RL_API 120/60s, keyed IP, fail-open có log, namespace_id
  riêng từng env (1xxx/2xxx/3xxx). KÈM: /v1/chat bắt buộc session
  (chặn open relay — user duyệt); streamChat gắn bearer
  (`services/token.ts` tách riêng tránh import cycle).
- ~~B5 Thinking-level → API thật~~ ĐÃ XONG 2026-07-03: contract
  `thinking?: ThinkingLevel` (off/low/normal/high, validate ở
  parseChatRequest) · client gửi `prev.thinkingLevel` · mapping:
  Claude adaptive-gen (opus-4-6+/sonnet-4-6+/sonnet-5/fable/mythos) →
  `thinking:{type:'adaptive'}` + `output_config:{effort}` (budget_tokens
  bị 400 ở gen này); Claude budget-gen (haiku-*, ≤4.5) →
  `enabled`+`budget_tokens` 2048/8192/16384 (max_tokens luôn > budget);
  Gemini 2.5 → `thinkingConfig.thinkingBudget` (off: pro floor 128 vì
  không tắt được, flash 0; low 2048; normal omit = dynamic; high 24576;
  gemini-3* omit — gen đó dùng thinkingLevel); OpenAI gpt-5*/o* →
  `reasoning_effort` (off→minimal chỉ gpt-5*, o-series omit);
  ollama: chưa (B6). Gemini transform đã cộng thoughtsTokenCount vào
  outputTokens từ trước — metering đúng sẵn.
- ~~B4 structured logging~~ ĐÃ XONG 2026-07-03: middleware x-request-id (cf-ray ưu tiên, UUID fallback) trên MỌI response + log JSON mỗi request (method/path/status/ms, skip healthz) + log ‘chat’ per call (provider/model/status/uid/thinking/atts, không content) · client hiện ‘req ‹id›’ trong error card để correlate với wrangler tail. CÒN: B6 ollama client-direct · B7 sync
  cursor/live-push · CI deploy-dev.yml ĐÃ CÓ (chờ GH secret
  CLOUDFLARE_API_TOKEN) · AE_SQL_TOKEN chờ user tạo.

Design/Product:
- **D1 Tools web/fetch/files/bash là MOCK** (RẤT LỚN — định hướng
  sản phẩm, cần owner chọn scope thật).
- ~~D2 Onboarding cho social login~~ ĐÃ XONG 2026-07-03: `PATCH
  /v1/me` (drizzle update `user.assistant_name`, validate 1-60 ký tự;
  cột = marker "đã onboard") · login.tsx route social first-login →
  /onboarding khi `assistantName === null` · completeOnboarding +
  đổi tên trong Settings (debounce 800ms) đều PATCH để cột không
  lệch với op-log sync (tránh race hydrateUser vs hydrateSync).
- ~~Persona → system prompt THẬT~~ ĐÃ XONG 2026-07-03:
  `services/prompt.ts` (buildSystemPrompt: tên trợ lý + 4 style toggle
  → directive + custom prompt + project instructions, mỗi phần 1
  section) · state mới `systemPrompt` (persist + op-log sync) · tab
  Trợ lý: textarea editable thay text tĩnh (`settings.systemPlaceholder`).
- ~~D3 auto-title~~ ĐÃ XONG 2026-07-03 (đi từ UX design theo chỉ đạo):
  `Conversation.title: string | null` — null = chưa đặt, UI hiện
  "Untitled" muted (Sidebar/TopBar/Palette/Drawer qua VM fg/untitled);
  reply đầu hoàn tất → `services/title.ts` gọi /v1/chat với model RẺ
  NHẤT trong whitelist của provider đang dùng (haiku-4-5 / 2.5-flash /
  gpt-5-mini; ollama giữ model chat), thinking off, maxTokens 24,
  sanitize (unquote + cap 48); fail → giữ Untitled, reply sau retry;
  rename tay luôn thắng (updater re-check null); demo fake layer đặt
  titleFrom(prompt) sau reply đầu. Lưu ý kỹ thuật: conv mới sinh chưa
  commit vào sRef khi stream resolve đồng bộ → điều kiện "không tìm
  thấy = unnamed".
- D4 account settings (đổi mật
  khẩu/xoá tài khoản) · D5 email verify/reset (cần chọn email
  provider — hỏi owner vì đụng nguyên tắc CF-only) · D6 R4 iOS +
  F3 + P1/P3/P4 (chờ điều kiện) · D7 custom domain nova.kinal.co.

Nhắc user: rotate R2/CF-Images token; dismiss Dependabot esbuild
(accepted-risk); nâng actions Node 24 runner.

## MOBILE AUDIT ĐÃ SHIP (2026-07-03)

- Menu conversation FULL PARITY trên MobileDrawer (rename/pin/archive/
  export×2/share/unshare/delete) + section LƯU TRỮ khôi phục được —
  DrawerConvRow tách component dùng chung recent+archived.
- Type scale có PAIRED line-height trong @theme (--text-*--line-height)
  — hết lh:1 crush khi wrap; không cần leading-* thủ công cho token.
- [data-hover=soft] gate @media(hover:hover) — hết sticky-hover sau tap;
  touch nhận :active wash (hover:none → active hover-2).
- Pressed feedback: MENU_ITEM/navRow/palette rows/settings tabs/social
  buttons đều có active:bg — touch không còn bấm-không-thấy-gì.
- .tap-sm (34px min trên touch) cho compact controls cạnh .tap 44px.

### Hotfix sau audit (user báo 3 bug — cùng ngày)

- **Menu conv trong drawer bấm không được**: Radix DropdownMenu portal ra
  <body>, MENU_CONTENT z-40 < drawer scrim z-48 → menu chìm dưới scrim,
  mọi tap rơi vào scrim. Fix: popover layer (MENU_CONTENT + TopBar menus
  + HoverCard + Composer popover) → **z-[80]** — layer transient cao nhất.
  LUẬT: menu/popover mở từ trong Dialog PHẢI có z cao hơn scrim của Dialog.
- **Icon lệch trong nút .tap**: .tap phình min 44px nhưng nút thiếu
  items-center justify-center → icon dạt góc trên-trái (hamburger TopBar,
  ✕ drawer). Fix: center + negative margin (-ml-3/-mr-3) giữ optical
  alignment. LUẬT: mọi nút icon mang .tap/.tap-sm phải flex + center 2 trục.
- **Conv row drawer 60px quá cao**: nút options .tap min-height 44 nằm
  IN-FLOW + row py-2 → 60px. Fix: row min-h-11 (44px), con self-stretch,
  options w-11 — bỏ .tap in-flow. LUẬT: đừng đặt .tap trong flow của row
  gọn — cho nút self-stretch theo row có min-h.
- Kèm: navRow drawer min-h-11; collapse-sidebar (desktop) hit-box size-9
  (trước chỉ 16×16!); demo badge ẩn text trên mobile (title đỡ bị ép);
  nút Thoát demo + focus-mode đủ tap target (tap-sm).
- Verify: Playwright context hasTouch+isMobile 390×844 — tap icon mở
  drawer, elementFromPoint tại menuitem = menuitem (trước = scrim), tap
  Ghim thành công, row 44px.

### Design pass 2 (user chỉ đạo — cùng ngày)

- **Active = MÀU CHỮ, không phải nền**: conv/project đang mở đọc qua
  `var(--accent-text)`, bg luôn transparent (chỉ hover wash tạm thời).
- **EM-RATIO**: padding/gap của component chạy theo chữ dùng em
  (`py-[0.45em] px-[0.85em] gap-[0.85em]`); px chỉ cho icon/dot/border.
  Conv+project rows sidebar/drawer = `text-meta` (12px) — user chốt
  sidebar list type 10–12px. Desktop row ~28px; drawer min-h-10 (40px).
- **Button vocabulary** `components/ui.ts`: BTN_PRIMARY/BTN_SECONDARY —
  “mảnh giấy”: hairline shadow `0_1px_0_var(--border)`, rounded-md,
  `active:translate-y-px`, padding em. Áp: error card CTAs, stop, toast.
- **Toast**: z-50→z-[90], `w-max max-w-[min(92vw,26rem)]` (fixed+left-50%
  shrink-to-fit chỉ được 50vw → trước đó hẹp + cao trên mobile).
- **Error card chat**: `flex-wrap` + text `basis-[14rem]` → mobile nút
  xuống dòng riêng, hết co kéo.
- **Lazy conversation**: “Cuộc trò chuyện mới” KHÔNG tạo conv — chỉ
  goTo('/new') + `homeProject` (state) giữ project đích; conv sinh ở lần
  send đầu (send đã lazy sẵn). Lưu ý VM: trên Home nav.activeConv =
  cached last conv (by design) → sent/hasDemo phản ánh conv cũ, Home
  không render thread nên vô hại — ĐỪNG assert chúng trên Home.
- **E2E mobile project mới** (`playwright.config.ts` project 'mobile',
  Pixel 7 chromium — không cần tải webkit): `e2e/mobile.spec.ts` 4 test
  guard: menu trên scrim (actionability), nav+close drawer, geometry
  44px/icon-centered/row≤48px, elementFromPoint sweep không bị overlay
  che. Đây là tầng “sự thật UI” — jsdom không thấy layout/z-index/touch.

### Chat UX pass 3 (user báo — cùng ngày)

- **Smart Placement** bật ở wrangler.jsonc (placement.mode=smart, kế thừa
  cả 2 env): Anthropic/OpenAI 403 “Request not allowed” /
  unsupported_country với egress colo châu Á — Worker giờ chạy gần
  upstream US. Nếu vẫn 403: phương án B là AI Gateway.
- **humanErrorDetail** (`services/errors.ts`): bóc message trong cùng
  từ body JSON provider (kể cả double-encoded), phân lớp 403-region /
  401-key / 429-rate / 529-overloaded thành câu tiếng Việt (i18n
  chat.err*), fallback `code: innermost`. Đừng bao giờ render raw JSON
  lên error card.
- **Edit không đổi nội dung = KHÔNG tạo version** — editMessage so
  text.trim() với block text gốc, giống nhau → chỉ đóng edit mode.
  Branch chỉ sinh khi message đổi thật hoặc regenerate.
- **ProviderNudge** (BYOK empty-state): khi provider của ACTIVE model
  không có profile live (real world) → chat không bao giờ trống rỗng:
  EmptyChat thay bằng card “Kết nối nhà cung cấp”, chat có sẵn tin +
  Home hiện strip compact trên composer. CTA: chưa accountId → /login,
  có rồi → settings=providers. VM: needsProvider/nudgeLogin/nudgeGo.

### D5 email verification (2026-07-04)

- **Transport = Microsoft Graph** (`apps/api/src/mail.ts`), KHÔNG SMTP:
  Office365 SMTP basic-auth bị Microsoft chặn (535 5.7.139 — đã test
  thật qua worker-mailer, xác nhận chặn). Graph = OAuth2
  client-credentials → POST /users/{sender}/sendMail, HTTP thuần, hoạt
  động hoàn hảo từ Workers (proven: signup + resend trả 202/200 live).
- Secrets (dev + prod): MS_GRAPH_TENANT_ID / _CLIENT_ID / _CLIENT_SECRET /
  _MAIL_SENDER (sender@kinalgames.com) / _SAVE_TO_SENT_ITEMS. Local dev
  KHÔNG cấu hình → mailConfigured() false → sendVerificationEmail bỏ qua
  (signup vẫn chạy, chỉ không gửi mail).
- Better Auth `emailVerification: { sendOnSignUp, autoSignInAfterVerification,
  sendVerificationEmail }` — callback rewrite callbackURL sang WEB_ORIGIN
  để sau khi verify user quay về web app. KHÔNG bật requireEmailVerification
  (không khóa tài khoản cũ chưa verify như tester@nova.dev).
- UI: `emailVerified` qua meShape + SessionUser → `VerifyBanner` (strip warn
  dưới TopBar, chỉ hiện khi loggedIn + emailVerified===false) + nút "Gửi
  lại email" gọi POST /api/auth/send-verification-email. VM: needsVerify,
  resendVerify. i18n: chat.verifyBody/verifyCta/verifySent.
- Email template `email-templates.ts`: paper-look inline-style HTML + text.

## QUYẾT ĐỊNH ĐÓNG (user chốt 2026-07-03)

- **CI auto-deploy: WON'T DO** — CI testing trên GitHub Actions giữ
  nguyên (gate khách quan); deploy tay wrangler sau gate xanh là đủ.
  Đã xoá .github/workflows/deploy-dev.yml.
- **B6 ollama-localhost: DEFERRED đến desktop app** — Worker cloud
  không với tới localhost; ollama self-host qua URL công khai VẪN chạy
  qua proxy ngay hôm nay. i18n sub của provider ollama đã nói rõ.

## LUẬT TEST TÀI KHOẢN (user chỉ đạo 2026-07-03)

- Smoke live trên dev CHỈ dùng tài khoản cố định tester@nova.dev —
  KHÔNG tạo account tạm trên dev nữa.
- Test DESTRUCTIVE (xoá account, wipe…) chạy trên môi trường isolated
  (wrangler dev local) — không đụng dev/prod.
- UX: KHÔNG dùng full-redirect phá context cho các tương tác — OAuth
  đã chuyển sang POPUP (fallback redirect khi popup bị chặn).

## BẪY ĐÃ CẮN — đọc trước khi gõ lệnh

- **WS subprotocol + bearer (B7)**: `new WebSocket(url, ['nova-sync', rawToken])`
  NÉM SyntaxError ĐỒNG BỘ trong browser nếu token chᤓa ký tự ngoài RFC6455
  token-chars ('=', '/', '+'…) — retry loop quay mãi mà không có socket nào
  (Node/undici LẠI CHẤP NHẬN → đừng dùng Node làm proof cho browser WS).
  Fix: base64url-encode bearer ở client, decode ở Worker route.
- **B7 socket lifecycle**: (1) open() bail khi hidden MÀ không schedule → tab
  nền không bao giờ connect — giờ connect bất kể visibility (hibernation rẻ);
  (2) effect gắn theo accountId-dep không re-run sau login — giờ start từ
  MOUNT, chính startLiveSync poll token cục bộ 2s phẳng.

- **P0 frozen-app (đã fix)**: `uid()` từng là counter module `f${++n}` —
  reset mỗi page load, trong khi conv/message ids persist + sync → đụng id
  cũ → message trùng id biến thread tree thành CHU TRÌNH → visiblePath
  treo vô hạn khi gửi tin vào conv cũ. Fix 3 tầng: uid = crypto.randomUUID;
  visiblePath cycle-guard; sanitizeThread(s) heal tại persist-load + sync-pull
  (dữ liệu hỏng ĐÃ lên server của user thật — heal bắt buộc).
  LUẬT: mọi id đi vào persistence/sync PHẢI unique toàn cục, không bao
  giờ dùng counter session-scoped.

- **OpenAI chặn region colo Worker**: smoke từ dev (colo gần VN) →
  `403 unsupported_country_region_territory` từ api.openai.com — user
  dùng key OpenAI qua proxy có thể dính tùy colo. Hướng xử lý khi cần:
  Smart Placement (`placement: {mode:"smart"}`) hoặc fallback route —
  chưa làm, theo dõi khi có user báo.

- **Rate Limiting binding overshoot trên production**: counter per-colo
  đồng bộ bất đồng bộ giữa các metal trong POP — burst ngắn vượt ~2×
  ngưỡng trước khi 429 (dev thực đo: cắn sau ~22 req với limit 10/60s;
  miniflare local cắn CHÍNH XÁC sau 10). Đây là shield chống abuse,
  KHÔNG dùng làm quota billing — quota chính xác cần DO counter.

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
