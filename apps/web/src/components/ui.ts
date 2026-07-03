// Paper-sheet button vocabulary — a button is a small slip of paper: hairline
// edge, one-pixel lift, and pressing it dips the sheet. Padding/gap are
// em-based so every button scales with its own type size.

const BTN_BASE =
  'inline-flex cursor-pointer select-none items-center justify-center gap-[0.5em] rounded-md px-[1.1em] py-[0.55em] text-small shadow-[0_1px_0_var(--border)] transition-transform duration-[80ms] active:translate-y-px active:shadow-none disabled:cursor-default disabled:opacity-[.38] disabled:active:translate-y-0'

export const BTN_PRIMARY = `${BTN_BASE} border border-ink bg-ink text-bg`

export const BTN_SECONDARY = `${BTN_BASE} border border-border bg-panel text-text hover:bg-hover-1 active:bg-hover-2`

export const BTN_DANGER = `${BTN_BASE} border border-danger-strong bg-danger-strong text-on-ink`

export const BTN_DANGER_OUTLINE = `${BTN_BASE} border border-danger-line bg-transparent text-danger`
