# UX refinements

> Branch: `feat/ux-refinements` (off `main`, no worktree). Prototype on the demo.

## Locked decisions
- Settings becomes a **Dialog** with a **left rail** (Chung / Nhà cung cấp / Trợ lý); chat stays mounted behind it.
- Conversation delete = **optimistic + "Hoàn tác" ~5s** before real removal.
- Conv **busy** indicator = small **pulse dot** left of the title.
- Order = **Phase A (polish) → B (sidebar) → C (settings dialog)**, then a closing **axe a11y** task.

## Constraints (copy verbatim)
| Key | Value |
|---|---|
| Trace meta (done) | `5 công cụ · 6.4 giây` |
| Trace terminal node | `Hoàn tất` |
| Undo affordance | `Hoàn tác` |
| Settings tabs | `Chung` · `Nhà cung cấp` · `Trợ lý` |

---

## Phase A — Conversation polish

### A1 — Trace: compact caret + terminal checkpoint
- `store.tsx`: `traceCaret` closed-state → `5 công cụ · 6.4 giây` for done, `''` for stream (drop "Xem Nova đã làm gì").
- `ConversationView.tsx` Trace: collapsed pill shows summary + meta + rotating chevron (button keeps an `aria-label`). Expanded timeline gets a final node **"Hoàn tất"** (filled accent dot + `check` icon + meta) when not streaming.

### A2 — Preview: click-outside closes
- `Preview.tsx`: the media-centering container calls `v.closePreview()` when the click target is itself (`e.target === e.currentTarget`). Root cause: `Dialog.Content` covers `inset-0`, so Radix `onPointerDownOutside` never fires.

### A3 — Layout-shift (CLS) on toggling labels
- `TopBar.tsx`: model switcher button gets a `min-width` sized to the longest label (`Thông minh`). Audit other toggling labels and reserve width where needed.

---

## Phase B — Sidebar conv list

### B1 — Item chrome: default clean, hover reveals actions
- `Sidebar.tsx` + `MobileDrawer.tsx`: drop the always-visible status dot; default = title only. On hover/focus reveal **pin** quick-toggle + **⋯** menu; title truncates. Pinned convs show a persistent pin icon.

### B2 — Conv states
- `store.tsx` `sideConvs`: add `pinned`, `busy`, `deleting` flags.
- `active` = accent-soft bg + accent text; `busy` = pulse dot left (conv generating a reply); `normal` = clean.

### B3 — Optimistic delete + undo
- `store.tsx`: `del()` marks the conv `deleting` (dimmed + spinner + `Hoàn tác`), schedules real removal after 5s; `undoDelete()` cancels the timer and restores. Real removal reassigns `activeConv` only if the deleted one was active.

---

## Phase C — Settings Dialog (merges SettingsView + NovaView)

### C1 — Dialog shell
- New `SettingsDialog.tsx` (Radix Dialog, ~860px, max-h 88vh, scroll; mobile = full-screen sheet) with a left rail.
- `store.tsx`: `settingsOpen: boolean`, `settingsTab: 'general' | 'providers' | 'assistant'`, `openSettings(tab)`, `closeSettings`, `setSettingsTab`.

### C2 — Sections
- **Chung**: theme, focus duration, account/logout, advanced toggle.
- **Nhà cung cấp**: provider list + custom-provider row (its own section).
- **Trợ lý**: answer styles, skills (`PresetCard` list), system prompt — ported from `NovaView`.

### C3 — Wiring + retire old views
- Sidebar `Cài đặt` → `openSettings('general')`; `Nova` → `openSettings('assistant')`; TopBar `Đổi nhà cung cấp` → `openSettings('providers')`.
- Remove the `settings` / `assistant` full-page views from `App.tsx` and the `view` enum; update tests that used `goSettings` / `goAssistant` / `view:'settings'`.

---

## Phase D — Accessibility

### D1 — axe scan + fixes
- Run `@axe-core/playwright` against the running app (driven via the MCP Playwright tools), record violations, fix them, re-scan to zero. Cover: conversation, settings dialog (all tabs), preview, sidebar hover states.

**Status:** ✅ axe = **0 violations** across home / conversation / settings (all tabs) / preview. `region` → `main`/`footer`/`aside` landmarks. `color-contrast` → text-safe `--accent-text` / `--success-text` / `--danger-text` / `--warn-text` (deeper sienna/forest, AA 4.5:1) used wherever the brand colors render as SMALL text; bright base colors stay for fills, borders, large text and icons.

## Design standard — size-neutral state
State changes (hover / active / busy / selected / pinned) must alter only color, background, opacity, box-shadow, outline — NEVER font-weight, border-width, padding, or element presence that reflows. Reserve space for emphasis (min-width, a fixed slot, or an absolute overlay). Applied: model switcher (min-width), settings tabs (color not weight), sidebar conv items (fixed busy slot + absolute hover actions + absolute pin).
