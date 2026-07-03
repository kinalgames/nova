// Paper-sheet button vocabulary — a button is a small slip of paper: hairline
// edge, one-pixel lift, and pressing it dips the sheet. Padding/gap are
// em-based so every button scales with its own type size.

export const BTN_PRIMARY =
  'inline-flex cursor-pointer select-none items-center justify-center gap-[0.5em] rounded-md border border-ink bg-ink px-[1.1em] py-[0.55em] text-small text-bg shadow-[0_1px_0_var(--border)] transition-transform duration-[80ms] active:translate-y-px active:shadow-none'

export const BTN_SECONDARY =
  'inline-flex cursor-pointer select-none items-center justify-center gap-[0.5em] rounded-md border border-border bg-panel px-[1.1em] py-[0.55em] text-small text-text shadow-[0_1px_0_var(--border)] transition-transform duration-[80ms] hover:bg-hover-1 active:translate-y-px active:bg-hover-2 active:shadow-none'
