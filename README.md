# Nova Flow

A light, editorial, single-flow AI chat "operating system" called **Nova** —
the name of both the app and its assistant. The interface language is
Vietnamese.

The design language is **"mọi thứ nằm trên một trang giấy"** (everything on one
sheet of paper): one tonal plane separated by tone and hairlines rather than
hard borders, **flat at rest** (only overlays — palette, popovers, dropdowns,
lightbox — cast shadow), ink-on-paper color, and type as the hero (display
font **Fraunces**, body **Geist**, mono **Geist Mono**).

> The app runs on **fake data and a fake service layer** — there is no backend.
> The behavior is built to match production (streaming replies, per-conversation
> history, provider key testing, file download, validated auth), so it is a
> runnable MVP rather than a static mock.

## Stack

- **React 19** · **Vite 7** · **TypeScript**
- **TanStack Router** — file-based routes (`src/routes/`), fully type-safe URLs;
  the URL is the single source of truth for navigation
- **Tailwind CSS v4** — mapped onto the design tokens via `@theme inline`, so
  `bg-panel` / `text-muted` / `font-display` follow the `.dark` variant
- **Radix UI** primitives (Dialog, Dropdown Menu, Switch, Visually Hidden)
- **lucide-react** icons via a semantic `Icon` wrapper

## Routing

The URL owns navigation (TanStack Router on browser history) — every screen is
deep-linkable, and back / forward / refresh all work:

| URL | Screen |
|-----|--------|
| `/` | Home (greeting + intent suggestions) |
| `/chat/:convId` | a conversation |
| `/projects` · `/projects/:projectId` | projects · project config |
| `/login` · `/signup` · `/onboarding` | auth (standalone, no chrome) |
| `?settings=general\|providers\|assistant` | Settings overlay (deep-linkable) |

`src/routes/_app.tsx` is the chrome layout (sidebar + top bar) wrapping the app
screens; transient UI (command palette, quiet mode, file preview, mobile
drawer) stays in the store, not the URL. `public/_redirects` is the SPA
fallback that serves `index.html` for any deep link on static hosts
(Cloudflare Pages / Netlify).

## Run

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # typecheck (tsc -b) + production build to dist/
npm run preview  # serve the production build
```

## Quality

```bash
npm run lint           # ESLint 9 (flat config) + jsx-a11y
npm run format         # Prettier (+ tailwindcss plugin)
npm test               # Vitest + Testing Library (happy-dom)
npm run test:coverage  # coverage, gated at 95/91/95/96 (stmts/branches/funcs/lines)
npm run test:e2e       # Playwright + @axe-core (structural a11y hard-gated to 0)
```

The unit suite (~150 tests) covers the store logic, real Radix interaction, and
full-view render, and runs in a few seconds. The e2e suite hard-gates zero
structural WCAG 2 A/AA violations and tracks contrast against a ratchet baseline.

## What's implemented

Every screen and control from the design, fully interactive:

- **Sidebar** (collapsible) — projects (Chung + Aurora), recent conversations
  (rename / pin / delete, persisted), Nova / Settings / account — plus a sliding
  **mobile drawer**.
- **Top bar** — project pill, context/memory meter, **model switcher**
  (Thông minh / Nhanh), focus button.
- **Home** — time-aware greeting + intent suggestions.
- **Conversation** — full tool-use trace (think → `web_search` → `fetch`
  error/retry → `read_file` → `bash` → `write`) and a **demo state switcher**:
  Đang soạn (stream) · Chờ duyệt (approval) · Hoàn tất (done) · Lỗi (error).
- **Composer** — "Add to chat" (＋) popover with real file upload, staged
  attachments, project picker, thinking-level menu (Tắt / Thấp / Vừa / Cao),
  tool toggles.
- **Projects**, **Project config** (instructions, files, skill presets),
  **Nova** (style, skills, system prompt), **Settings** (advanced toggle,
  providers, theme, focus duration, account).
- **Command palette (⌘K)**, **quiet/focus mode (⌘.)**,
  **file/media preview** (image · pdf · code · csv · md), **auth**
  (login / signup / onboarding).
- **Advanced (pro) mode** — a single toggle (currently on by default) that
  _reveals_ the raw tool-call trace inline (tool names, exit codes, raw I/O).
  Everything else is unified into one friendly wording for everyone: skill
  tool-chips and the shortcuts bar are always visible, and the exact token
  count is one hover away on the context meter.

### Production-like behavior (fake services)

- **Streaming chat** — `src/services/chat.ts` composes a varied, contextual
  reply and `send()` streams it word by word into the active conversation,
  paced by the selected model and thinking level, with a live caret.
- **Per-conversation history** — each conversation has its own message thread;
  switching loads that thread, New chat creates a fresh one, deleting reassigns
  the active conversation. Threads persist to `localStorage`.
- **Provider settings** — API keys are editable and persisted; "Lưu & kiểm tra"
  runs an async check that resolves to connected / error.
- **File download / open** — `src/services/files.ts` produces real `Blob`
  downloads and opens previews in a new tab.
- **Auth** — the login form validates email and password before proceeding.
- **Theme & settings persistence** — light / dark (a swatch picker; dark is a
  `.dark` class, not `prefers-color-scheme`); model, providers, thinking level, tool toggles,
  answer styles, skill presets, focus duration, conversations and threads all
  persist. The storage key is versioned (`PERSIST_KEY`), so a persisted-shape
  change invalidates incompatible older data instead of corrupting state.

## Project structure

```
src/
  state/        store (React context) + derived values, types
  routes/       file-based route tree (__root, _app chrome layout, chat/projects/auth)
  router.tsx    router instance + typed context
  data/         static definitions (presets, providers, suggestions, seed threads)
  services/     fake service layer — chat (streaming), files (download/open)
  components/   sidebar, top bar, composer, settings dialog, overlays, Icon, ToggleRow
  views/        home, conversation, projects, project config
  test/         shared test harness + setup
  index.css     design tokens (:root + .dark) and Tailwind theme mapping
  App.tsx       mounts the RouterProvider
```

State lives in `src/state/store.tsx` as a React context: a single `state` object
plus a `deriveValues()` function that computes everything the views render, so
components stay declarative and the behavior is centralized. Navigation state
(which view, active conversation, auth screen, settings tab) is **derived from
the URL** via the router rather than held in the store, so the address bar and
the UI can never disagree.
