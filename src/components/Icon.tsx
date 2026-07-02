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
  FileText,
  Folder,
  Image as ImageIcon,
  Inbox,
  Info,
  ListTodo,
  LogIn,
  Maximize2,
  Menu,
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
  X,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

/**
 * One ink-stroke icon vocabulary for the whole app. Semantic names so call
 * sites read intent, not glyphs. Everything inherits currentColor and sits on
 * the text baseline — a drawn mark on the same sheet of paper.
 */
const REGISTRY = {
  plus: Plus,
  search: Search,
  nova: Sparkle,
  focus: Timer,
  file: FileText,
  settings: Settings,
  terminal: SquareTerminal,
  image: ImageIcon,
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
