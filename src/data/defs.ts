// Static definitions ported verbatim from the Lumen Flow prototype logic.

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
  connected: { badge: 'Đã kết nối', fg: 'var(--success)', bg: 'var(--success-bg)' },
  add: { badge: 'Thêm khóa', fg: 'var(--warn)', bg: 'var(--warn-bg)' },
  local: { badge: 'Cục bộ', fg: 'var(--success)', bg: 'var(--success-bg)' },
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

export interface SideConvDef {
  id: string
  title: string
  active: boolean
}

export const convDefs: SideConvDef[] = [
  { id: 'c1', title: 'Đối chiếu benchmark đối thủ', active: true },
  { id: 'c2', title: 'Đoạn mở đầu trang đích', active: false },
  { id: 'c3', title: 'Lịch nội dung 6 tuần', active: false },
  { id: 'c4', title: 'Phân tích khảo sát', active: false },
]
