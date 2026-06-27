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
        <div onClick={pr.toggle} style={css(`width:40px;height:23px;border-radius:12px;background:${pr.trackBg};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0`)}>
          <div style={css(`position:absolute;left:2px;top:2px;width:19px;height:19px;border-radius:50%;background:var(--knob);transform:${pr.knobTx};transition:transform .2s;box-shadow:var(--knob-shadow)`)} />
        </div>
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
