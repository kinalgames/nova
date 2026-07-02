import * as Switch from '@radix-ui/react-switch'

interface ToggleRowProps {
  title: string
  sub: string
  on: boolean
  onToggle: () => void
  last?: boolean
}

/**
 * A labelled setting row with a real, accessible switch (Radix: role=switch,
 * aria-checked, Space/Enter, focus ring). Styled with token-mapped Tailwind.
 */
export function ToggleRow({ title, sub, on, onToggle, last }: ToggleRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-0.5 py-3.5 ${
        last ? '' : 'border-b border-border'
      }`}
    >
      <div className="min-w-0">
        <div className="text-base text-text">{title}</div>
        <div className="text-small text-muted">{sub}</div>
      </div>
      <Switch.Root
        checked={on}
        onCheckedChange={onToggle}
        aria-label={title}
        className="relative h-[23px] w-10 shrink-0 cursor-pointer rounded-full bg-border p-0.5 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-[19px] rounded-full bg-[var(--knob)] shadow-[var(--knob-shadow)] transition-transform data-[state=checked]:translate-x-[17px]" />
      </Switch.Root>
    </div>
  )
}
