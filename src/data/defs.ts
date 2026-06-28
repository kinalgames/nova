// Static definitions ported verbatim from the Nova Flow prototype logic.

import type { IconName } from '../components/Icon'

export type PresetId = 'code' | 'design' | 'research' | 'writing' | 'data'

export interface PresetDef {
  id: PresetId
  name: string
  glyph: IconName
  color: string
  badgeBg: string
  help: string
  tools: string[]
}

export const presetDefs: PresetDef[] = [
  {
    id: 'code',
    name: 'Lập trình',
    glyph: 'command',
    color: 'var(--info)',
    badgeBg: 'rgba(59,91,169,.12)',
    help: 'Viết và sửa mã, giải thích code dễ hiểu.',
    tools: ['Chạy lệnh', 'Tệp', 'Đọc web'],
  },
  {
    id: 'design',
    name: 'Thiết kế',
    glyph: 'design',
    color: 'var(--plum)',
    badgeBg: 'rgba(154,91,138,.12)',
    help: 'Góp ý bố cục, màu sắc, giao diện.',
    tools: ['Đọc web', 'Tệp'],
  },
  {
    id: 'research',
    name: 'Nghiên cứu',
    glyph: 'search',
    color: 'var(--success)',
    badgeBg: 'rgba(62,138,94,.12)',
    help: 'Tìm thông tin và dẫn nguồn rõ ràng.',
    tools: ['Tra web', 'Đọc web'],
  },
  {
    id: 'writing',
    name: 'Viết lách',
    glyph: 'write',
    color: 'var(--accent)',
    badgeBg: 'var(--accent-soft)',
    help: 'Viết email, bài đăng, tài liệu mạch lạc.',
    tools: [],
  },
  {
    id: 'data',
    name: 'Phân tích dữ liệu',
    glyph: 'data',
    color: 'var(--warn)',
    badgeBg: 'rgba(181,133,63,.14)',
    help: 'Đọc bảng số, rút ra kết luận.',
    tools: ['Chạy lệnh', 'Tệp'],
  },
]

export type ProviderId = 'claude' | 'gemini' | 'openai' | 'ollama'
export type ProviderStatus = 'connected' | 'add' | 'local'

export interface ProviderDef {
  id: ProviderId
  name: string
  sub: string
  glyph: string
  badgeBg: string
  badgeFg: string
  status: ProviderStatus
  models: string[]
  field: 'key' | 'endpoint'
  fieldValue: string
  rec: boolean
}

export const provDefs: ProviderDef[] = [
  {
    id: 'claude',
    name: 'Claude',
    sub: 'Anthropic · cân bằng',
    glyph: 'C',
    badgeBg: 'var(--accent-soft)',
    badgeFg: 'var(--accent)',
    status: 'connected',
    models: ['claude‑opus‑4', 'claude‑sonnet‑4', 'claude‑haiku‑4'],
    field: 'key',
    fieldValue: 'sk‑ant‑••••••••••  4f2a',
    rec: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    sub: 'Google · ngữ cảnh lớn',
    glyph: 'G',
    badgeBg: 'rgba(59,91,169,.14)',
    badgeFg: 'var(--info)',
    status: 'add',
    models: ['gemini‑2.5‑pro', 'gemini‑2.5‑flash'],
    field: 'key',
    fieldValue: 'Dán API key của bạn…',
    rec: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    sub: 'GPT · đa năng',
    glyph: 'O',
    badgeBg: 'var(--border)',
    badgeFg: 'var(--text)',
    status: 'connected',
    models: ['gpt‑5', 'gpt‑5‑mini', 'o4'],
    field: 'key',
    fieldValue: 'sk‑••••••••••••  9c1d',
    rec: false,
  },
  {
    id: 'ollama',
    name: 'Trên máy của bạn',
    sub: 'Ollama · riêng tư, ngoại tuyến',
    glyph: '◍',
    badgeBg: 'var(--success-bg)',
    badgeFg: 'var(--success)',
    status: 'local',
    models: ['llama3.2', 'qwen2.5', 'mistral‑nemo'],
    field: 'endpoint',
    fieldValue: 'http://localhost:11434',
    rec: false,
  },
]

export const statusMap: Record<
  ProviderStatus,
  { badge: string; fg: string; bg: string }
> = {
  connected: { badge: 'Đã kết nối', fg: 'var(--success-text)', bg: 'var(--success-bg)' },
  add: { badge: 'Thêm khóa', fg: 'var(--warn-text)', bg: 'var(--warn-bg)' },
  local: { badge: 'Cục bộ', fg: 'var(--success-text)', bg: 'var(--success-bg)' },
}

export interface SuggestionDef {
  title: string
  sub: string
  glyph: IconName
  bg: string
  fg: string
}

export const suggestionDefs: SuggestionDef[] = [
  {
    title: 'Viết giúp tôi',
    sub: 'Email, bài đăng, tin nhắn — rõ ràng và đúng giọng.',
    glyph: 'write',
    bg: 'var(--accent-soft)',
    fg: 'var(--accent)',
  },
  {
    title: 'Lên kế hoạch',
    sub: 'Chia một việc lớn thành các bước làm được.',
    glyph: 'plan',
    bg: 'rgba(59,91,169,.12)',
    fg: 'var(--info)',
  },
  {
    title: 'Tìm hiểu',
    sub: 'Giải thích một chủ đề thật dễ hiểu.',
    glyph: 'search',
    bg: 'rgba(62,138,94,.12)',
    fg: 'var(--success)',
  },
  {
    title: 'Xử lý tài liệu',
    sub: 'Tóm tắt, trích xuất, đối chiếu tài liệu của bạn.',
    glyph: 'file',
    bg: 'rgba(154,91,138,.12)',
    fg: 'var(--plum)',
  },
]

export interface ProjectDef {
  id: string
  name: string
  description: string
  /** accent dot colour token */
  accent: string
  /** the catch-all project — cannot be renamed or deleted */
  isDefault?: boolean
}

export const projectDefs: ProjectDef[] = [
  {
    id: 'chung',
    name: 'Chung',
    description: 'Cuộc trò chuyện chưa thuộc dự án nào sẽ ở đây.',
    accent: 'var(--faint)',
    isDefault: true,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description:
      'Ra mắt Aurora vào Q3. Đối tượng là người làm việc sâu, ghét phân tâm. Giọng tự tin, không phô trương. Luôn tham chiếu Định-vị-v2.md khi nói về thông điệp.',
    accent: 'var(--accent)',
  },
]

export interface SideConvDef {
  id: string
  title: string
  projectId: string
  demo?: boolean
}

export const convDefs: SideConvDef[] = [
  { id: 'c1', title: 'Đối chiếu benchmark đối thủ', projectId: 'aurora', demo: true },
  { id: 'c2', title: 'Đoạn mở đầu trang đích', projectId: 'aurora' },
  { id: 'c3', title: 'Lịch nội dung 6 tuần', projectId: 'aurora' },
  { id: 'c4', title: 'Phân tích khảo sát', projectId: 'chung' },
]

const M = (who: string, text: string, isNova = false) => ({
  who,
  color: isNova ? 'var(--accent)' : 'var(--muted)',
  text,
  isNova,
})

// seeded message history per conversation (the demo c1 renders the scripted
// tool-trace showcase instead, so it starts empty)
export const seedThreads: Record<string, ReturnType<typeof M>[]> = {
  c1: [],
  c2: [
    M('MINH', 'Viết giúp mình đoạn mở đầu cho trang đích Aurora.'),
    M('NOVA', 'Mình mở bằng một câu chốt định vị, rồi ba lợi ích ngắn. Bạn muốn giọng tự tin hay thân thiện?', true),
  ],
  c3: [
    M('MINH', 'Lên lịch nội dung sáu tuần trước ra mắt.'),
    M('NOVA', 'Mình chia theo ba giai đoạn: Định vị → Sản xuất → Ra mắt, mỗi tuần một chủ đề trục.', true),
  ],
  c4: [M('MINH', 'Tóm tắt khảo sát người dùng giúp mình.')],
}
