// Shared Tailwind class strings for Radix dropdown surfaces — one paper-sheet
// popover vocabulary so every menu looks and behaves identically.

export const MENU_CONTENT =
  'z-40 min-w-[12rem] max-w-[88vw] rounded-md border border-border bg-panel p-1.5 ' +
  'shadow-pop animate-[fadeUp_140ms_var(--ease-paper)] origin-[var(--radix-dropdown-menu-content-transform-origin)]'

export const MENU_LABEL =
  'px-2.5 pb-1.5 pt-2 font-mono text-eyebrow tracking-[0.14em] text-label'

export const MENU_ITEM =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-ui ' +
  // active: = pressed feedback — the only visual response touch devices get
  'text-text outline-none data-[highlighted]:bg-hover-1 active:bg-hover-2'

export const MENU_ITEM_DANGER = `${MENU_ITEM} text-danger`

export const MENU_SEP = 'my-1 mx-1.5 h-px bg-border'
