import * as Switch from '@radix-ui/react-switch'
import { css } from '../css'
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
    <div style={css(`border:1px solid ${pr.border};background:${pr.bg};border-radius:13px;padding:14px 15px`)}>
      <div style={css('display:flex;align-items:center;gap:12px')}>
        <span style={css(`width:34px;height:34px;border-radius:9px;background:${pr.badgeBg};color:${pr.color};display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>
          <Icon n={pr.glyph} size={17} />
        </span>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('font-size:15.5px')}>{pr.name}</div>
          <div style={css('font-size:13px;color:var(--muted);margin-top:2px;line-height:1.4')}>{pr.help}</div>
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
        <div style={css('margin-top:11px;display:flex;flex-wrap:wrap;gap:6px;padding-left:46px')}>
          {pr.tools.map((tl, i) => (
            <span key={i} style={css("font-family:var(--font-mono);font-size:10.5px;color:var(--muted);background:var(--fill);border-radius:6px;padding:3px 8px")}>
              {tl.t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
