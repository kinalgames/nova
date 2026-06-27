# Lumen Flow

A faithful, interactive implementation of the **Lumen Flow** design — a light,
editorial, single-flow AI chat "operating system." The app is **Lumen**; the
assistant is **Nova**. Built from the Claude Design handoff bundle (see
[`HANDOFF.md`](./HANDOFF.md), [`chats/`](./chats), and [`project/`](./project)).

Stack: **React 18 + Vite + TypeScript**. All UI is recreated pixel-faithfully
from the prototype; the interface language is Vietnamese, matching the design.

## Run

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build
```

## What's implemented

Everything from the prototype, fully interactive:

- **Seamless sidebar** (collapsible) with projects (Chung + Aurora), recent
  conversations, Nova/Settings/account — plus a sliding **mobile drawer**.
- **Top bar**: project pill, context/memory meter, **model switcher**
  (Thông minh / Nhanh), focus button.
- **Home** — greeting + intent suggestions.
- **Conversation** — full tool-use trace (think → web_search → fetch
  error/retry → read_file → bash → write) and a **demo state switcher**:
  _Đang soạn (stream) · Chờ duyệt (approval) · Hoàn tất (done) · Lỗi (error)_.
- **Composer** — "Add to chat" (＋) popover, staged attachments, project
  picker, thinking-level menu (Tắt/Thấp/Vừa/Cao), tool toggles.
- **Projects**, **Project config** (instructions, files, skill presets),
  **Nova** (style, skills, system prompt), **Settings** (advanced toggle,
  providers Claude/Gemini/OpenAI/Ollama, theme, focus duration, account).
- **Inspector**, **command palette (⌘K)**, **quiet/focus mode (⌘.)**,
  **file/media preview** (image · pdf · code · csv · md), **auth**
  (login / signup / onboarding).
- **Simple vs Advanced** mode — Advanced only _reveals_ extra technical detail
  (raw tool names, exit codes, tokens, API keys, system prompt) in the same
  layout; it never hides anything from basic users.

### Real local functionality (beyond a static mock)

- **Real file upload** — the ＋ menu's "Tải ảnh lên" / "Tải tệp lên" open real
  file pickers; uploaded files are staged as chips and uploaded images preview
  via object URLs in the lightbox.
- **Theme persistence** — light / dark / auto persists to `localStorage`;
  `auto` follows the OS `prefers-color-scheme`. Dark mode genuinely re-themes
  the whole app via CSS variables.
- **Persisted settings** — advanced mode, model, providers, thinking level,
  tool toggles, answer styles, skill presets and focus duration all persist.
- **Working forms & shortcuts** — message composer, command palette, auth
  flows, and the `⌘K` / `⌘.` / `Esc` keyboard shortcuts are all live.

## Project structure

```
src/
  state/        store (ported DC logic), types
  data/         static definitions (presets, providers, suggestions)
  components/   sidebar, top bar, composer, inspector, menus, overlays
  views/        home, conversation, projects, project config, nova, settings
  css.ts        helper: inline-CSS string -> React style object
  App.tsx       layout composition
```

The state store (`src/state/store.tsx`) is a direct port of the prototype's
`DCLogic` class — its `state` and `renderVals()` derived values — into a React
context, so behaviour matches the design 1:1.
