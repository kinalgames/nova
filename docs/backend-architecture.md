# Backend architecture — requirements derived from the finished UI

> Status: **UI-first phase COMPLETE (tracks A·P·E·B·C·D + debt cleanup).**
> This document is now the build plan: the data model below is derived 1:1
> from the shipped client types (`packages/shared` will lift them verbatim).

## Approved decisions (unchanged)

| Area | Decision |
|---|---|
| Runtime | Cloudflare Workers + **Hono** (`@hono/zod-openapi` → OpenAPI 3.1) |
| Database | **Cloudflare-native two-tier** (revised per owner directive — no third-party SaaS): **D1** for cross-entity metadata (users, sessions, settings, projects, conversation list, provider profiles; Drizzle D1 adapter) + **Durable Objects with SQLite storage, one DO per user**, for message content (version trees, blocks). Per-user DOs shard naturally (10GB *per user*, unbounded aggregate) and the DO's single-threaded transactional storage gives BETTER per-conversation consistency than Postgres-over-HTTP — the original reason for rejecting D1 (message volume + transactions) is solved by the DO tier, not by an external PG. Usage metering → **Workers Analytics Engine** (append-only) with roll-ups in D1. Trade-off accepted: global search/export fan out across DOs; D1 metadata covers the common queries. |
| Auth | **Better Auth** (≥1.5) — email+password + Google/GitHub OAuth, session cookies. Workers pitfalls: per-request instance on Hono context; always pass `ctx.waitUntil` |
| Files | R2 (presigned upload, metadata in D1). EXISTING infra on the owner account: bucket `files` → `files.kinal.co`, plus **Cloudflare Images** (`img.kinal.co`, variant `ai`) for image delivery/offload — credentials live in `apps/api/.dev.vars` (gitignored) locally and `wrangler secret put` in prod |
| Search & RAG | **Vectorize** (CF-native vector index; embeddings via Workers AI free tier or BYOK provider) for semantic search over conversations/project files + **D1 FTS5** for keyword search — replaces the pgvector role; vector↔relational joins happen at the app layer (fine at per-user scale) |
| Repo | **npm workspaces** monorepo: `apps/web` · `apps/api` · `packages/shared` (pnpm was blocked by a corepack EPERM on the dev machine; npm→pnpm later is a cheap lockfile swap) |
| Dependency principle | **Cloudflare-only infrastructure + self-written/OSS code** (owner directive, tightened): NO third-party SaaS at all — storage/queues/analytics all Cloudflare (free tiers), libraries only OSS (Hono, Better Auth, Drizzle). The single unavoidable external dependency is the LLM providers themselves — BYOK, user-owned. |
| API | REST `/v1`, cursor pagination, RFC 7807 errors + `code` + `request_id`, per-user rate limits (KV) |
| Chat streaming | `POST /v1/conversations/:id/messages` → SSE: `message_start · block_delta · block_stop · message_stop · error` — maps 1:1 onto the client Message/Block model |
| BYOK | provider keys write-only, AES-GCM envelope encryption at rest (master key = Worker secret), decrypt only in-Worker at proxy time, never logged, never returned |
| Migration | `POST /v1/import` accepts the client persist-slice (**current shape: v5** — `state/persist.ts` is the contract) to lift localStorage users onto the server |
| Hyperdrive/Neon | **Dropped** (third-party SaaS). If Postgres is ever genuinely needed, the OSS-compliant path is self-hosted PG behind Hyperdrive — a contained swap at the Drizzle layer. |

## Data model — lifted from the shipped client

Every shape below already exists in `src/state/types.ts` and is exercised by
271 unit + 12 e2e tests. The backend adopts them as-is; `packages/shared`
becomes their single home.

| Table | Source type | Notes |
|---|---|---|
| `users` | Better Auth | + `user_name`, `assistant_name` (Track D profile) |
| `user_settings` | persist slice | theme/styles/tools/slots/activeSlot/autoRotate/… as JSONB, versioned like `PERSIST_VERSION` |
| `projects` | `Project` | name, description (= instructions, injected into the system prompt server-side), accent, presets JSONB, is_default |
| `project_files` | `ProjectFile` | R2 object key + kind/name/meta; presigned upload |
| `conversations` | `Conversation` | title, project_id, pinned, archived, **updated_at** (drives date grouping), demo flag dropped server-side |
| `messages` | `Message` | id, conversation_id, **parent_id** (version tree), role, who, blocks **JSONB**, feedback, created_at |
| `conversation_selection` | `Thread.selected` | the selected-version map per conversation (small JSONB on `conversations` is fine to start) |
| `provider_profiles` | `AuthProfile` | provider_id, name, kind (`account`/`api_key`), **credential encrypted**, status, limited_until, priority (rotation order) |
| `usage_events` | `MsgUsage` | input/output tokens, model_id, profile_id, at — append-only; powers cost meter, monthly roll-up, future billing |

Server-side reuse of shipped client logic (pure modules, portable as-is):
- `state/rotation.ts` — profile rotation (ordered priority + sticky) runs at
  the proxy layer with real 429 handling filling `limited/limitedUntil`.
- `state/thread.ts` — the version-tree helpers define the message-tree
  semantics the API must honour (sibling versions, visible path).
- `state/organize.ts` — export serializers move server-side for share links.
- `data/defs.ts` model catalog + pricing — the proxy validates model ids and
  meters cost from the same table.

## Client architecture — LOCAL-FIRST (decided)

Owner requirements: native apps must be **as fast as possible**, OS-level
native only (desktop likely Rust). That property comes from local-first, not
from any server database: every read/write hits device-local SQLite (0ms),
sync runs in the background.

- **Sync = op-log**, not CRUD: the shipped thread tree is append-mostly by
  design (edits/regenerates create SIBLING versions — the ‹i/n› feature), so
  sync conflicts resolve by keeping both siblings. BE2 designs the op-log
  protocol; it is the anchor for every future native client.
- **SQLite on both ends**: device SQLite ↔ per-user DO SQLite — symmetric
  schema, durable server-side op-log + snapshot.
- **Search runs on-device** (SQLite FTS5 + `sqlite-vec`, OSS): instant,
  offline, private. Server-side Vectorize remains optional for cross-device
  cold-start and web.
- **Native stack (decided)**: one **Rust core** (domain + SQLite + sync +
  crypto) with **UniFFI** bindings → thin native UIs — desktop in Rust
  (GPUI / iced / Slint, chosen via a spike), iOS SwiftUI, Android Compose.
  Tauri is ruled out (webview ≠ native rendering). `packages/shared` (TS) is
  the living spec the Rust core ports from.
- **Web stays React** (already shipped) with its store as an optimistic
  cache over the same op-log endpoints; long-term the Rust core can compile
  to WASM to unify. The fake service layer stays behind a **demo mode** flag
  (logged-out experience + offline fallback + test harness).
- **Sequencing (decided)**: backend first (BE1–BE3 with op-log sync), native
  clients start once the API is stable.

Scale disciplines locked for 100M-user headroom:
1. BE1 auth issues **bearer tokens from day one** (Better Auth bearer
   plugin) alongside web session cookies — native clients never force an
   auth rework.
2. **Conversation list lives in the per-user DO from BE2** (not D1), and
   sessions cache in KV — D1 stays a thin auth/user lookup, removing its
   scale ceiling up front.
3. The API is a product: REST /v1 + OpenAPI; every platform is just a
   client; no web-only logic server-side.

## Zero-downtime deploy & update

**Client side — SHIPPED in Track E:** chunk-load-failure recovery (rate-limited
single reload on `vite:preloadError`) · update-available toast
(`__BUILD_ID__` + `/version.json` polling) · stepwise persist migrations
(`state/persist.ts`, v4→v5 proven).

**API side (to build):**
- Workers deploys are atomic per-request; SSE connections drop on deploy →
  client auto-reconnect with resume (`Last-Event-ID`).
- DB schema changes follow **expand → migrate → contract** (never a breaking
  DDL in one step) so old+new Worker versions can serve during rollout.
- `/v1` versioning + `Deprecation`/`Sunset` headers for breaking API changes.

## Phasing

- **BE0 — monorepo scaffold ✓ DONE**: npm workspaces (`apps/web` = the
  complete client, all gates preserved; `apps/api` = Hono skeleton with
  /healthz + wrangler.jsonc + tests; `packages/shared` = first shared
  contracts — AuthProfile/ModelRef/SlotId/MsgUsage/… + the rotation engine,
  consumed by BOTH web and api). GitHub Actions CI runs
  typecheck/lint/coverage/build + e2e. Message/Block move to shared at BE2
  (they still carry a web-only IconName dependency to untangle).
- **BE1 — auth**: Better Auth on **D1** (Drizzle adapter), sessions, the
  existing /login /signup /onboarding screens go live; profile
  (userName/assistantName) on `users`. Local dev is fully offline
  (`wrangler dev` with local D1) — no cloud account or secrets needed until
  deploy; OAuth credentials arrive later (email/password first).
- **BE2 — op-log sync & import (SHIPPED, v1)**: record-level op-log —
  envelope `{kind: put|del, table: settings|project|conversation|thread, id,
  value, at}` with a server-authoritative `seq`. One SQLite-backed
  **UserStore DO per user** holds the records with tombstones;
  `GET/POST /v1/sync` (session-gated) pulls deltas by `since` and applies
  batches. The web client hydrates on boot (server wins per record), an
  empty server receives the full local push — which IS the localStorage
  import path — and every later persist writes a debounced record diff.
  Conversation list + threads live in the DO; D1 stays thin (auth only).
  v1 granularity: whole `thread` values per conversation — native clients
  granularize to per-message ops later without changing the envelope.
  Still open for BE2.x: per-device `since` cursors for incremental pulls,
  live cross-device push (DO WebSocket), and op-level merge instead of
  record LWW.
- **BE3 — provider proxy + real streaming** (FIRST SLICE SHIPPED, pulled
  forward for credential testing): `POST /v1/chat` proxies Anthropic with SSE
  transformed to the Nova contract; both credential kinds work —
  「Khóa API」 via `x-api-key` (official) and 「Tài khoản」 setup-token via the
  Claude Code transport (Bearer + oauth beta flags + CLI identity block —
  EXPERIMENTAL, gray-zone vs provider terms, user's own subscription only).
  No sampling params are sent (models ≥4.7 reject them). The web client
  routes through the proxy whenever a NON-DEMO profile exists for the
  routed provider (seeded demo credentials never leave the device); real
  usage lands on the message, 429 puts the profile into its cool-down so
  rotation moves on. The model catalog now carries the REAL Anthropic
  lineup (claude-opus-4-8 · claude-sonnet-5 · claude-haiku-4-5, current
  pricing). Still to come in BE3 proper: server-side encrypted BYOK storage
  (credentials currently transit per-request from the client — acceptable
  for local dev only), rotation server-side, usage events to Analytics
  Engine, and the remaining providers.
- **BE4 — files & share**: R2 presigned uploads for project files +
  attachments; real share links (`/share/:id` read-only page).
- **BE5 — hardening**: rate limits, observability (structured logs +
  request_id end-to-end), backup/restore drill, load test, security review
  (BYOK path especially).

## Known accepted risks

- Dependabot moderate GHSA-67mh-4wv8-2f99 (old esbuild inside
  `@esbuild-kit/esm-loader`, a transitive dep of **drizzle-kit**): dev-only
  CLI run manually for migration generation — it never opens the vulnerable
  dev server and ships nothing to production. No fix without downgrading
  drizzle-kit (breaking); revisit when drizzle-kit drops @esbuild-kit (their
  migration to tsx is in progress). Safe to dismiss in the GitHub alert.

## Open items to confirm before BE0

1. Cloudflare + Neon accounts/billing owner; domain for staging/prod.
2. Restructure THIS repo into the monorepo (git history preserved via
   `git mv src → apps/web/src`) vs a fresh repo — recommendation: this repo.
3. First real provider for BE3 — recommendation: Claude (Anthropic API).
