# Backend architecture — requirements derived from the finished UI

> Status: **UI-first phase COMPLETE (tracks A·P·E·B·C·D + debt cleanup).**
> This document is now the build plan: the data model below is derived 1:1
> from the shipped client types (`packages/shared` will lift them verbatim).

## Approved decisions (unchanged)

| Area | Decision |
|---|---|
| Runtime | Cloudflare Workers + **Hono** (`@hono/zod-openapi` → OpenAPI 3.1) |
| Database | **Postgres (Neon) via Hyperdrive**, Drizzle ORM (NOT D1 — messages volume outgrows SQLite's 10GB/no-interactive-transaction limits) |
| Auth | **Better Auth** (≥1.5) — email+password + Google/GitHub OAuth, session cookies. Workers pitfalls: per-request instance on Hono context; always pass `ctx.waitUntil` |
| Files | R2 (presigned upload, metadata in PG) |
| Repo | **npm workspaces** monorepo: `apps/web` · `apps/api` · `packages/shared` (pnpm was blocked by a corepack EPERM on the dev machine; npm→pnpm later is a cheap lockfile swap) |
| Cost principle | **Free tier · Cloudflare-native · open source first** (user directive): Workers/R2/KV/Hyperdrive within CF free tiers, Neon free tier for PG, Hono/Better Auth/Drizzle all OSS — no paid third-party services without explicit sign-off |
| API | REST `/v1`, cursor pagination, RFC 7807 errors + `code` + `request_id`, per-user rate limits (KV) |
| Chat streaming | `POST /v1/conversations/:id/messages` → SSE: `message_start · block_delta · block_stop · message_stop · error` — maps 1:1 onto the client Message/Block model |
| BYOK | provider keys write-only, AES-GCM envelope encryption at rest (master key = Worker secret), decrypt only in-Worker at proxy time, never logged, never returned |
| Migration | `POST /v1/import` accepts the client persist-slice (**current shape: v5** — `state/persist.ts` is the contract) to lift localStorage users onto the server |

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

## Client integration model (proposed)

The client keeps its store as an **optimistic cache**: actions apply locally
exactly as today, then reconcile with the API (mutation queue, last-write-wins
per record to start). Chat streaming swaps `streamReply`'s fake engine for the
SSE consumer — same `appendChild`/`updateMessage` calls, so MessageView and
the whole A-track UI stay untouched. The fake service layer is kept behind a
**demo mode** flag (logged-out experience + offline fallback + test harness).

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
- **BE1 — auth**: Better Auth, sessions, the existing /login /signup
  /onboarding screens go live; profile (userName/assistantName) on `users`.
- **BE2 — sync & import**: settings/projects/conversations/messages CRUD,
  cursor pagination, `POST /v1/import` (persist v5), client store becomes the
  optimistic cache; date groups/archive/export/share keep working from
  server data.
- **BE3 — provider proxy + real streaming**: BYOK encrypted profiles, SSE
  chat with the rotation engine + real usage events; slots route to real
  models (Claude first, then OpenAI/Gemini/Ollama-remote).
- **BE4 — files & share**: R2 presigned uploads for project files +
  attachments; real share links (`/share/:id` read-only page).
- **BE5 — hardening**: rate limits, observability (structured logs +
  request_id end-to-end), backup/restore drill, load test, security review
  (BYOK path especially).

## Open items to confirm before BE0

1. Cloudflare + Neon accounts/billing owner; domain for staging/prod.
2. Restructure THIS repo into the monorepo (git history preserved via
   `git mv src → apps/web/src`) vs a fresh repo — recommendation: this repo.
3. First real provider for BE3 — recommendation: Claude (Anthropic API).
