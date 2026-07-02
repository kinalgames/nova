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

## A — Conversation core (approved decisions)

| Item | Decision |
|---|---|
| A1 Composer | Multi-line textarea, auto-grow to ~8 lines. Desktop: Enter=send, Shift+Enter=newline. Mobile: Enter=newline, send via button. Applies to chat composer AND /new. |
| A2 Edit/Regenerate | **Versions model** (sibling versions per message, `‹ 2/3 ›` navigation beside the message; the visible tail follows the selected version). Message schema gains `versions`. User messages: Sao chép · Sửa. Replies: Sao chép · Tạo lại + 👍👎 feedback (UI-only for now). |
| A3 Markdown | Full markdown rendered inside text blocks (headings, lists, tables, links, code fences). Syntax highlight: **shiki, lazy-loaded** with the chat route. Code cards reuse the existing `bg-code-bg` terminal style + copy button. |
| A4 Scroll | Scroll-to-bottom floating button; auto-stick to bottom during streaming only when the user is already near the bottom (never yank while reading history). |

## P — Provider & assistant depth (approved decisions)

| Item | Decision |
|---|---|
| Roles | Two fixed model roles: **Thông minh** / **Nhanh**. Roles are GLOBAL, **cross-provider**: each role points at `{ providerId, modelId }` from any configured provider, or `null` = our recommended default. `activeProvider` becomes derived from the role in use — sending with a role uses that role's provider + its auth profiles. |
| Model picker | Rows render `[provider icon] [model name]` + `đề xuất` chip; grouped by provider; providers without an active auth profile are disabled with a hint. |
| Auth kinds | 「**Tài khoản**」= OAuth / setup-token (subscription: Claude Pro, ChatGPT Plus, Gemini Advanced — cost 0, package rate-limits) · 「**Khóa API**」= developer key (pay-per-token). |
| Profiles | Per provider: ordered list of mixed-kind `AuthProfile { id, name, kind, credential, status: active|limited|error|untested, limitedUntil? }`. UI: numbered priority list, drag to reorder, per-row test/rename/delete, "+ Thêm hồ sơ". |
| Rotation | Ordered priority + **sticky fallback**: use highest-priority active profile; on 429/limit mark `limited(+until)` and fall to the next; auto-recover to the higher profile when the limit expires. Toggle `autoRotate` per provider. No per-request round-robin. |
| Usage & cost | Assistant messages carry `usage { inputTokens, outputTokens, modelId, profileId }` (estimated by the fake layer now; real API `usage` later — same schema). `cost = usage × pricing(modelId)`; profiles of kind Tài khoản cost 0 but still count tokens. Display: per-provider/profile usage table in Settings, per-reply meta in advanced mode (`· 1.2k↑ 3.4k↓ · ~$0.09`), monthly total. Pricing table lives in `data/defs.ts`. |

## E — Zero-downtime client
Update-available toast (version.json polling) · chunk-load-failure recovery
(reload once) · stepwise persist migrations `migrate(vN→vN+1)` replacing
"bump = discard".

## B — Organization
Date-grouped recents (Hôm nay/Hôm qua/Tuần này; needs real `updatedAt`) ·
archive · export conversation (.md/.json) · share-link stub.

## C — Projects completion
Real project file upload/remove (store + preview) · project color on
create/edit · project instructions actually consumed by `composeReply`.

## D — Account & settings
Profile (name/avatar; "Minh Trần" is hardcoded today) · onboarding persists
choices · data controls (export all / clear all) · keyboard-shortcuts
cheatsheet dialog.
