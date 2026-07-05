/**
 * Nova's actual brand mark — a minimal crescent disc (solid ink circle with
 * a shadow-carved crescent), not a drawn icon. This already existed in the
 * sidebar/auth screens; reused everywhere "this is Nova" needs a visual
 * anchor (message avatars, the empty-chat hero, toasts) instead of each
 * spot drawing its own icon-in-a-circle badge.
 *
 * `on` names the CSS var of the surface the mark sits ON — the shadow color
 * must match the surface it's carved into, or the crescent reads as a grey
 * smudge instead of a cutout. Check the containing element's own background
 * before picking it (`--bg` for the main sheet, `--panel` for panels/toasts,
 * `--side` for the sidebar rail).
 */
export function NovaMark({
  size = 13,
  on = '--bg',
  className,
}: {
  size?: number
  /** the CSS var (with its leading --) of the surface behind this mark */
  on?: string
  className?: string
}) {
  const offset = -Math.round(size * 0.23)
  return (
    <div
      className={`shrink-0 rounded-full bg-ink ${className ?? ''}`}
      style={{ width: size, height: size, boxShadow: `inset ${offset}px ${offset}px 0 var(${on})` }}
    />
  )
}
