import { css } from '../css'

interface ToggleRowProps {
  title: string
  sub: string
  on: boolean
  accent: string
  onToggle: () => void
  last?: boolean
}

export function ToggleRow({ title, sub, on, accent, onToggle, last }: ToggleRowProps) {
  const trackBg = on ? accent : 'var(--border)'
  const knobTx = on ? 'translateX(17px)' : 'translateX(0)'
  const borderStyle = last ? 'none' : '1px solid var(--border-2)'
  return (
    <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;border-bottom:${borderStyle};font-family:var(--font-body)`)}>
      <div style={css('min-width:0')}>
        <div style={css('font-size:16px;color:var(--text)')}>{title}</div>
        <div style={css('font-size:13px;color:var(--muted)')}>{sub}</div>
      </div>
      <div onClick={onToggle} style={css(`width:40px;height:23px;border-radius:12px;background:${trackBg};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0`)}>
        <div style={css(`position:absolute;left:2px;top:2px;width:19px;height:19px;border-radius:50%;background:var(--knob);transform:${knobTx};transition:transform .2s;box-shadow:var(--knob-shadow)`)} />
      </div>
    </div>
  )
}
