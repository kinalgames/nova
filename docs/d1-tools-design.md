# D1 — Real tools: web search · fetch · files (· bash deferred)

Status: APPROVED 2026-07-04 — P1→P2→P3, OpenAI Responses migration + search
confirmed in-scope; adapters + loop live in a new `packages/ai` lib; search
chip defaults OFF per conversation. Owner: Nova.

Design doctrine: clean-room. Patterns were studied from prior art
(granular stream events, streaming-JSON tool args), but every type,
name and line here is Nova's own, shaped around Nova's existing
contract (`NovaStreamEvent`) and UI (`TraceStep`, `sources` block).

## 1. Goal

Give chats real capabilities instead of decorative ones:

| Tool   | v1 scope                                                        |
|--------|-----------------------------------------------------------------|
| search | Provider-NATIVE web search whenever `caps.webSearch` (BYOK pays) |
| fetch  | Provider-native URL fetch/grounding where offered                |
| files  | Nova function-calling tool — read the user's project attachments |
| bash   | DEFERRED to the desktop app (no sandbox in a Worker)             |

Non-goals v1: Nova-side search engine (Brave/SearXNG) for ollama/local
models — backlog until a desktop/local story exists; MCP; computer use.

## 2. Architecture — server-side loop in POST /v1/chat

The chat proxy grows from a 1-shot pipe into a bounded agentic loop,
still inside the single existing request (pure I/O wait — CPU-time
safe on Workers):

```
client ── POST /v1/chat ──► worker
                             │  round 1..N (N ≤ LOOP_MAX)
                             │  ├─ adapter.call(messages + tools)
                             │  ├─ stream events ──► SSE to client (live trace)
                             │  ├─ model stops with toolUse?
                             │  │    ├─ native tool (search/fetch): provider ran it
                             │  │    │  itself — no loop round consumed, just map
                             │  │    │  its result events onto the trace
                             │  │    └─ Nova tool (files): execute in worker,
                             │  │       append tool_result turn, next round
                             │  └─ model stops normally → message_stop, done
```

- Native tools (search/fetch) execute inside the provider — the worker
  only forwards the tool declaration and maps result blocks to events.
- Nova tools (files) execute in the worker between rounds. The loop —
  not the client — owns the tool sub-conversation; the client only
  renders what the SSE tells it.
- Multi-turn continuity v1: past assistant turns are replayed as plain
  text (tool interactions collapsed). The trace is preserved in the
  stored message for display, not resent to the model.

## 3. Provider matrix (verified 2026-07)

| Provider  | search                            | fetch                    | function calling |
|-----------|-----------------------------------|--------------------------|------------------|
| Anthropic | `web_search` server tool          | `web_fetch` server tool  | yes              |
| Gemini    | `google_search` grounding         | `url_context`            | yes              |
| OpenAI    | **Responses API only** — Chat Completions has no hosted web_search (only legacy `-search-preview` models) | via web_search | yes (both APIs) |
| Ollama    | none                              | none                     | model-dependent (`caps.toolUse`) |

Consequences:

- **OpenAI migrates to the Responses API** (approved) — the only way to
  native search, and OpenAI's recommended surface going forward
  (built-in tools, reasoning summaries, stateful features later).
- Gemini `account`-kind credentials ride the cloudcode/gemini-cli
  endpoint — tool support there must be probed before enabling the
  search chip for account profiles (risk: api_key-only at first).
- Ollama gets no search in v1; `files` works wherever `caps.toolUse`.

Billing: native search is billed by the provider to the user's own
key (e.g. Anthropic ~$10/1k searches, Gemini grounding per-query) —
zero Nova infra cost, consistent with BYOK.

## 4. Nova tool: `files`

Function-calling tool executed in the worker, owner-checked like every
attachment path today:

```jsonc
{ "name": "files",
  "description": "List or read the user's files attached to this project",
  "parameters": { "op": "list" | "read", "id?": "file id from list" } }
```

- Backing store: existing R2 `att/{userId}/{fileId}` + files.ts index.
- `read` returns text content (text files) or a typed stub for
  binaries; hard cap per result (§6).
- No write ops in v1 — read-only eliminates a whole abuse class.

## 5. SSE contract v2 (`NovaStreamEvent`)

Superset of today's four events — additive, both ends deploy together:

```ts
type NovaStreamEvent =
  | { type: 'message_start' }
  | { type: 'block_delta'; text: string }              // unchanged: reply text
  | { type: 'thinking_delta'; text: string }           // NEW: was dropped before
  | { type: 'tool_start'; id: string; name: string }   // NEW: native + Nova tools
  | { type: 'tool_delta'; id: string; text: string }   // NEW: args/queries as they stream
  | { type: 'tool_result'; id: string; ok: boolean; summary: string;
      sources?: { n: number; url: string; title: string }[] } // NEW
  | { type: 'message_stop'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; code?: string; message?: string }
```

- `thinking_delta` fixes a real gap: reasoning models currently think
  invisibly; the UI shows nothing until the reply starts.
- `sources` on `tool_result` feeds the existing `sources` block +
  citation rendering.
- Adapters translate their upstream idioms (Anthropic
  `server_tool_use`/`web_search_tool_result` content blocks, Gemini
  `groundingMetadata`, OpenAI Responses `web_search_call` items) into
  these events; streaming-JSON tool args accumulate via `tool_delta`.

## 6. UI mapping

- **Live trace**: `tool_start/delta/result` + `thinking_delta` append
  `TraceStep`s (`think`/`tool` kinds — renderer already shipped and
  kept for exactly this) on the streaming message; collapses to the
  summary line when done. Works identically on mobile (trace already
  responsive-tested).
- **Sources block**: `tool_result.sources` accumulate into the
  message's `sources` block; citations link out.
- **Composer “Thêm vào chat” menu** (shipped): the existing web/fetch
  rows are now real — OFF by default, persisted with settings, and
  capability-gated: on a model without `caps.webSearch` the rows
  render faint and inert, and the request never carries the flags.
  (Local models join once a Nova-side search engine exists.)
- **files**: no chip — advertised to the model automatically when the
  conversation's project has files; the model decides.

## 7. Cost & abuse guards (non-negotiable)

- `LOOP_MAX = 6` Nova-tool rounds per request; exceeded → graceful
  "tool budget exhausted" note streamed, reply continues without tools.
- Native search caps forwarded: Anthropic `max_uses: 5` per request;
  Gemini/OpenAI equivalents where offered.
- `files.read` result hard-capped (16 KiB per read, 3 reads/request);
  oversized → truncated with an explicit marker so the model knows.
- Per-request wall clock unchanged (client abort signal already
  propagates); loop checks `signal.aborted` between rounds.
- Usage metering: every round's tokens feed the same AE datapoint tap;
  search-tool surcharges are provider-side (user's key), noted in docs.
- No tool executes for anonymous callers — /v1/chat already requires a
  session; files stays owner-checked by uid.

## 8. Phasing

- **P1 — contract + native search/fetch (Anthropic, Gemini api_key)**:
  SSE v2 events, adapter mappings, thinking_delta, composer chip,
  live trace + sources. No loop needed — provider executes.
- **P2 — agentic loop + `files` tool**: bounded loop in the worker,
  function-calling wiring per adapter, guards of §7.
- **P3 — OpenAI Responses migration**: port openai.ts to Responses
  API (streaming events differ), then enable webSearch cap for the
  GPT-5.5/5.4 line. Runs right after P1 (same adapter headspace),
  before the P2 loop — user call: OpenAI search ships with D1, not
  optional.
- Probe (parallel, cheap): Gemini account-kind tool support.

Each phase lands with the full gate (typecheck/lint/unit/coverage/
build/e2e) + live smoke on dev before prod.
