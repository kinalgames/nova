import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  Command,
  Copy,
  Diamond,
  Download,
  Eye,
  FileText,
  Folder,
  Globe,
  Image as ImageIcon,
  Inbox,
  Info,
  ListTodo,
  LogIn,
  Maximize2,
  Menu,
  Mic,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkle,
  Square,
  SquareTerminal,
  ThumbsDown,
  ThumbsUp,
  Timer,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

/**
 * One ink-stroke icon vocabulary for the whole app. Semantic names so call
 * sites read intent, not glyphs. Everything inherits currentColor and sits on
 * the text baseline — a drawn mark on the same sheet of paper.
 *
 * SIZE BY ROLE, not by eye — an audited size scale (2026-07-05) collapsed
 * several near-duplicate values that had drifted apart for the SAME role
 * (e.g. a dropdown caret at 12/13/14px across different files, two Settings
 * close buttons at 18/19px for the identical button). Match the closest
 * existing role below before picking a number:
 *   9–11  — glyph inside a tiny circular status dot/badge
 *   12    — disclosure caret (dropdown/accordion open-indicator) — ALWAYS 12
 *   13–14 — inline glyph beside body text (selection checkmark, tag icon)
 *   15    — leading icon inside a menu-item's own badge chip (24–30px box)
 *   16–17 — icon on a standalone control (toolbar button, full-bleed dialog
 *          close — mobile drawer + Settings both use 17)
 *   18+   — hero/empty-state icon, deliberately prominent
 * When in doubt, grep this file's role comment before introducing a new size.
 */
const REGISTRY = {
  plus: Plus,
  search: Search,
  globe: Globe,
  nova: Sparkle,
  focus: Timer,
  file: FileText,
  settings: Settings,
  terminal: SquareTerminal,
  image: ImageIcon,
  eye: Eye,
  mic: Mic,
  wrench: Wrench,
  expand: Maximize2,
  folder: Folder,
  fetch: ArrowDown,
  thumbUp: ThumbsUp,
  thumbDown: ThumbsDown,
  download: Download,
  send: ArrowUp,
  think: Diamond,
  caret: ChevronDown,
  close: X,
  write: PenLine,
  check: Check,
  open: ArrowUpRight,
  more: MoreHorizontal,
  collapse: PanelLeftClose,
  expandRail: PanelLeftOpen,
  menu: Menu,
  design: Palette,
  retry: RotateCcw,
  stop: Square,
  info: Info,
  back: ArrowLeft,
  login: LogIn,
  inbox: Inbox,
  user: UserRound,
  command: Command,
  data: BarChart3,
  plan: ListTodo,
  copy: Copy,
  pin: Pin,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof REGISTRY

export function Icon({
  n,
  size = 18,
  stroke = 1.75,
  fill = 'none',
  style,
  className,
}: {
  n: IconName
  size?: number
  stroke?: number
  fill?: string
  style?: CSSProperties
  className?: string
}) {
  const C = REGISTRY[n]
  return (
    <C
      size={size}
      strokeWidth={stroke}
      fill={fill}
      className={className}
      style={{ flexShrink: 0, display: 'block', ...style }}
    />
  )
}
