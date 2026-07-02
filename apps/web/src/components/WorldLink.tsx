import { Link } from '@tanstack/react-router'
import { useStore } from '../state/store'

interface Props extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** an app path ("/chat/$convId", "/projects/…") — never an auth path */
  to: string
  params?: Record<string, string>
  /** TanStack Link pass-through: renders the anchor inert (undo window rows) */
  disabled?: boolean
}

/**
 * A Link that stays inside its world: within the /demo tree every app path
 * is prefixed so navigation never crosses the real/demo boundary by accident.
 * The demo tree mirrors the app tree route-for-route, so the loose typing
 * here is safe by construction (this is the single dynamic-path point).
 */
export function WorldLink({ to, params, ...rest }: Props) {
  const { v } = useStore()
  const target = v.isDemo && !to.startsWith('/demo') ? `/demo${to}` : to
  return <Link {...(rest as object)} to={target as never} params={params as never} />
}
