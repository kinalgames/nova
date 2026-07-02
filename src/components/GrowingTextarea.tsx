import { useLayoutEffect, useRef } from 'react'

/**
 * Auto-growing textarea: expands with content up to `maxHeight`, then scrolls
 * inside itself. Shrinks back when content is removed/cleared.
 */
export function GrowingTextarea({
  className = '',
  maxHeight = 220,
  value,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { maxHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // happy-dom reports 0 — leave height auto in tests
    if (el.scrollHeight === 0) return
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value, maxHeight])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={`resize-none bg-transparent outline-none ${className}`}
      {...rest}
    />
  )
}
