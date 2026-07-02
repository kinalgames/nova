# Backend architecture — approved direction (build deferred)

> Status: **direction approved, build deferred** — the product is completing
> its feature surface UI-first; requirements derived from the finished UI
> will refine this document before any backend code is written.

## Approved decisions

| Area | Decision |
|---|---|
| Runtime | Cloudflare Workers + **Hono** (`@hono/zod-openapi` → OpenAPI 3.1) |
| Database | **Postgres (Neon) via Hyperdrive**, Drizzle ORM (NOT D1 — messages volume outgrows SQLite's 10GB/no-interactive-transaction limits) |
| Auth | **Better Auth** (≥1.5) — email+password + Google/GitHub OAuth, session cookies. Workers pitfalls: per-request instance on Hono context; always pass `ctx.waitUntil` |
| Files | R2 (presigned upload, metadata in PG) |
| Repo | pnpm workspaces monorepo: `apps/web` · `apps/api` · `packages/shared` (Message/Block/Project/Conversation + zod) |
| API | REST `/v1`, cursor pagination, RFC 7807 errors + `code` + `request_id`, per-user rate limits (KV) |
| Chat streaming | `POST /v1/conversations/:id/messages` → SSE: `message_start · block_delta · block_stop · message_stop · error` — maps 1:1 onto the client Message/Block model |
| BYOK | provider keys write-only, AES-GCM envelope encryption at rest (master key = Worker secret), decrypt only in-Worker at proxy time, never logged, never returned |
| Migration | `POST /v1/import` accepts the client persist-slice (v3 shape) to lift localStorage users onto the server |

Phasing when building resumes: B0 monorepo → B1 auth → B2 sync/CRUD+import →
B3 provider proxy/SSE → B4 files → B5 hardening.

## Zero-downtime deploy & update

**Now (static SPA on CF Pages/Netlify):**
- Deploys are atomic (immutable build swap) — the *serving* side is already
  zero-downtime.
- The gap is **long-lived open tabs**: after a deploy, an old tab lazy-loading
  a code-split chunk hits a 404 (hashed chunks of the previous build are gone
  from the production alias). Required client features:
  1. **Chunk-load-failure recovery** — catch dynamic-import errors → reload
     once (guarded against loops).
  2. **Update-available toast** — poll a `version.json` (or use the build
     hash); on change show "Có bản mới — Tải lại" instead of breaking
     silently.
  3. **Persist migrations** — production must never discard user data on a
     schema change; replace "bump `PERSIST_KEY` = discard" with stepwise
     `migrate(vN → vN+1)` functions.

**Later (with the API):**
- Workers deploys are atomic per-request; SSE connections drop on deploy →
  client auto-reconnect with resume (`Last-Event-ID`).
- DB schema changes follow **expand → migrate → contract** (never a breaking
  DDL in one step) so old+new Worker versions can serve during rollout.
- `/v1` versioning + `Deprecation`/`Sunset` headers for breaking API changes.
