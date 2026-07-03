# Feature roadmap — UI-first (approved)

> Product decision: complete the feature surface UI-first on the fake service
> layer; derive backend requirements from the finished UI. Backend direction
> is parked in `docs/backend-architecture.md`.

Build order: **A1/A4 → I18N → A2/A3 → P → E → B → C → D** (A/P both touch the
Message schema — A's `versions` lands first, P's `usage` layers on top; i18n
lands before the string-heavy groups so they are built localized).

## I18N (approved: react-i18next + typed keys · vi default + en · chrome first)

Done (M1+M2+M3): infrastructure, typed catalogs, the ENTIRE chrome (all
components/views incl. Settings/Auth/Quiet/Preview), store VM strings,
data/defs vocabulary (presets/providers/status/suggestions translated at
consumption — defs carry ids only), language picker in Settings → General
(NGÔN NGỮ), e2e pinned to `locale: 'vi-VN'`, unit tests pinned to vi.
**Rule: every new user-facing string goes through `t()` — no hardcoded copy
in components or the VM.**
Remaining (phase 2): locale-aware demo seed content (seedThreads, project
seeds, preview documents, QuietMode sample conversation).

## A — Conversation core (DONE — all four shipped)

| Item | Decision |
|---|---|
| A1 Composer ✓ | Multi-line textarea, auto-grow to ~8 lines. Desktop: Enter=send, Shift+Enter=newline. Mobile: Enter=newline, send via button. Applies to chat composer AND /new. |
| A2 Edit/Regenerate ✓ | **Versions model** — `Thread` tree (`src/state/thread.ts`: `{byId, children, selected}`, pure helpers) per conversation; sibling versions per message with `‹ i/n ›` navigation, the visible tail follows the selected version. User messages: Sao chép · Sửa (inline edit re-runs the reply). Replies: Sao chép · Tạo lại + 👍👎 feedback (UI-only). `streamReply(conv, parentId, prompt)` is the shared engine for send/edit/regenerate. |
| A3 Markdown ✓ | Full markdown inside text blocks via `react-markdown` + GFM (`src/components/Markdown.tsx`, `React.lazy` — plain-text `Rich` renders as the Suspense fallback). Code fences: **shiki** (`min-dark`, loaded only when a fence renders) in the `bg-code-bg` terminal card + copy button. Optimization debt: full `shiki` bundle ships the oniguruma wasm engine (~230 kB gz lazy chunk) — consider `shiki/bundle/web` or the JS regex engine when tuning bundle size. |
| A4 Scroll ✓ | Scroll-to-bottom floating button; auto-stick to bottom during streaming only when the user is already near the bottom (never yank while reading history). |

Shipped alongside A (found during browser verification): a message composed on
Home/`/new` starts a **fresh conversation** — titled from the prompt's first
line, in the composer's visible project — instead of appending to the
last-open thread; Home gets its own staged-files bucket (`HOME_TRAY`) so a new
chat never inherits another conversation's attachments.

## P — Provider & assistant depth (DONE — UI-first scope)

Shipped: cross-provider slots (`slots: {smart, fast}` × `{providerId, modelId}`,
`activeSlot` replaces the old `model`/`activeProvider`), `ModelDef` catalog with
per-1M pricing + stream pace in `data/defs.ts`, `AuthProfile` lists per provider
(add/test/reorder/remove, 「Tài khoản」/「Khóa API」), rotation engine
(`state/rotation.ts` — ordered priority + sticky fallback, `autoRotate` toggle),
`usage` on every streamed reply + conversation cost meter + per-reply advanced
meta + all-time per-profile totals, providers without a usable profile are not
routable (disabled chips + hint). PERSIST v4→v5.

Deviations from the letter of the spec (deliberate, documented):
reorder uses accessible ↑↓ arrows instead of drag; slots always point at a
concrete model (no `null` = recommended); monthly usage total deferred until
real timestamps land (B track); real OAuth flows/429 handling arrive with the
backend — `limited`/`limitedUntil` are already modeled and unit-tested.

| Item | Decision |
|---|---|
| Roles | Two fixed model roles: **Thông minh** / **Nhanh**. Roles are GLOBAL, **cross-provider**: each role points at `{ providerId, modelId }` from any configured provider, or `null` = our recommended default. `activeProvider` becomes derived from the role in use — sending with a role uses that role's provider + its auth profiles. |
| Model picker | Rows render `[provider icon] [model name]` + `đề xuất` chip; grouped by provider; providers without an active auth profile are disabled with a hint. |
| Auth kinds | 「**Tài khoản**」= OAuth / setup-token (subscription: Claude Pro, ChatGPT Plus, Gemini Advanced — cost 0, package rate-limits) · 「**Khóa API**」= developer key (pay-per-token). |
| Profiles | Per provider: ordered list of mixed-kind `AuthProfile { id, name, kind, credential, status: active|limited|error|untested, limitedUntil? }`. UI: numbered priority list, drag to reorder, per-row test/rename/delete, "+ Thêm hồ sơ". |
| Rotation | Ordered priority + **sticky fallback**: use highest-priority active profile; on 429/limit mark `limited(+until)` and fall to the next; auto-recover to the higher profile when the limit expires. Toggle `autoRotate` per provider. No per-request round-robin. |
| Usage & cost | Assistant messages carry `usage { inputTokens, outputTokens, modelId, profileId }` (estimated by the fake layer now; real API `usage` later — same schema). `cost = usage × pricing(modelId)`; profiles of kind Tài khoản cost 0 but still count tokens. Display: per-provider/profile usage table in Settings, per-reply meta in advanced mode (`· 1.2k↑ 3.4k↓ · ~$0.09`), monthly total. Pricing table lives in `data/defs.ts`. |

## E — Zero-downtime client (DONE)

Shipped: `__BUILD_ID__` baked in + `/version.json` emitted at build
(vite.config plugin); client polls on mount/focus/60s (`services/update.ts`)
and shows a paper toast (`UpdateToast`) with reload/dismiss · chunk-load
failure (`vite:preloadError`) reloads once, rate-limited via sessionStorage so
a genuinely-missing chunk cannot loop · persist moved to `state/persist.ts`
with STEPWISE migrations — v4→v5 maps `model`→`activeSlot` and connected
provider keys→auth profiles, upgrades write the new key and remove the old
("bump = discard" retired).

## B — Organization (DONE)

Shipped: `Conversation.updatedAt` (touched on every message activity; seeds
staggered across days) with date-grouped recents — GHIM / HÔM NAY / HÔM QUA /
TUẦN NÀY / CŨ HƠN (`state/organize.ts`, pure + tested; data predating the
field groups as "Cũ hơn" — no persist bump needed for additive optional
fields) · archive/unarchive per row menu with a collapsed LƯU TRỮ section ·
export .md (visible path) and .json (full version tree, lossless) with
sanitized filenames · share-link stub copies `https://nova.app/share/<id>`
and confirms via the new auto-clearing NoticeToast.

## C — Projects completion (DONE)

Shipped: real project files — `Project.files` (upload via hidden input +
`describeUpload` shared with the composer, per-row remove, opens in the
preview overlay; aurora seeds plan.md/Brief/Khảo-sát as data) · project
colour — swatch picker (`projectAccents` in defs) in the create dialog and
config page, sidebar dot follows · project instructions — `composeReply`
receives the project description as `instructions` and visibly steers the
reply (“Bám theo chỉ dẫn của dự án …”); the default project stays neutral.
Live mode composes the REAL system prompt client-side
(`services/prompt.ts`): persona (assistant name) + style toggles +
the user's own instructions + project instructions — sent as
`system` through the proxy to every provider adapter.

Note: the MCP preview browser crashed repeatedly during C3 verification
(container instability, not the app) — C3's real-browser proof lives in the
e2e suite instead (`project instructions visibly steer a project reply`).

## D — Account & settings (DONE)

Shipped: profile — `userName` + `assistantName` persisted, editable in
Settings → Chung (HỒ SƠ); sidebar/account/greeting labels and NEW message
`who` tags follow (seeded history keeps its original labels) · onboarding
choices persist for real — assistant name, style chips and the default slot
write through `completeOnboarding` · data controls — export-all (JSON of the
persisted store) + clear-all with inline confirm and reload · keyboard
cheatsheet dialog (only shortcuts that actually exist: ⌘K · ⌘. · ⏎ · ⇧⏎ ·
Esc), opened from the shortcuts bar.

With D, every planned UI-first track (A · P · E · B · C · D) is COMPLETE —
next phase: backend (`docs/backend-architecture.md`) + the deliberate debts
below.

Deliberate debts — ALL CLEARED (post-roadmap cleanup pass):

- **i18n phase 2 ✓** — demo seed content is locale-aware: structured bundles
  `src/data/seed.vi.ts` / `seed.en.ts` behind `getSeed()` (threads, projects,
  conv titles, auth-profile names, preview documents, preview metas, quiet
  sample). First-boot language decides what seeds the persisted store (seeds
  behave like user content afterwards); live-rendered pieces (quiet sample,
  preview bodies/metas) follow the current language. A structural-alignment
  test keeps both bundles in lockstep.
- **shiki slimming ✓** — `services/highlight.ts` uses `shiki/core` + the
  JavaScript regex engine: the 622 kB (~230 kB gz) oniguruma wasm chunk is
  gone from the runtime (e2e asserts zero wasm requests while a fence
  renders); grammars stay lazy per-language chunks.
- **monthly usage ✓** — `MsgUsage.at` timestamps every reply; Settings →
  Providers shows the current-month roll-up (SỬ DỤNG THÁNG NÀY).
- Real OAuth/429 handling intentionally remains with the backend phase.

Remaining i18n caveat (accepted): seeds persisted before this change (and
switching language mid-session) keep their original language — same rule as
real user content.
