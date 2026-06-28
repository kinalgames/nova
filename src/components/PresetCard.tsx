import * as Switch from '@radix-ui/react-switch'
import { Icon, type IconName } from './Icon'

export interface PresetVM {
  id: string
  name: string
  glyph: IconName
  color: string
  badgeBg: string
  help: string
  tools: { t: string }[]
  showTools: boolean
  on: boolean
  toggle: () => void
  trackBg: string
  knobTx: string
  border: string
  bg: string
}

export function PresetCard({ pr }: { pr: PresetVM }) {
  return (
    <div
      className="rounded-md border px-4 py-3"
      style={{ borderColor: pr.border, background: pr.bg }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-[34px] shrink-0 items-center justify-center rounded-sm"
          style={{ background: pr.badgeBg, color: pr.color }}
        >
          <Icon n={pr.glyph} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-body">{pr.name}</div>
          <div className="mt-0.5 text-small leading-snug text-muted">{pr.help}</div>
        </div>
        <Switch.Root
          checked={pr.on}
          onCheckedChange={pr.toggle}
          aria-label={pr.name}
          className="relative h-[23px] w-10 shrink-0 cursor-pointer rounded-full bg-border p-0.5 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=checked]:bg-accent"
        >
          <Switch.Thumb className="block size-[19px] rounded-full bg-[var(--knob)] shadow-[var(--knob-shadow)] transition-transform data-[state=checked]:translate-x-[17px]" />
        </Switch.Root>
      </div>
      {pr.showTools && (
        <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
          {pr.tools.map((tl, i) => (
            <span
              key={i}
              className="rounded-xs bg-fill px-2 py-0.5 font-mono text-eyebrow text-muted"
            >
              {tl.t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
