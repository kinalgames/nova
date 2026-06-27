// Shared Tailwind class strings for Radix dropdown surfaces — one paper-sheet
// popover vocabulary so every menu looks and behaves identically.

export const MENU_CONTENT =
  'z-40 min-w-[12rem] max-w-[88vw] rounded-[12px] border border-border bg-panel p-1.5 ' +
  'shadow-pop animate-[fadeUp_140ms_var(--ease-paper)] origin-[var(--radix-dropdown-menu-content-transform-origin)]'

export const MENU_LABEL =
  'px-2.5 pb-1.5 pt-2 font-mono text-[9.5px] tracking-[0.14em] text-label'

export const MENU_ITEM =
  'flex cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13.5px] ' +
  'text-text outline-none data-[highlighted]:bg-black/[0.04]'

export const MENU_ITEM_DANGER = `${MENU_ITEM} text-danger`

export const MENU_SEP = 'my-1 mx-1.5 h-px bg-border'
