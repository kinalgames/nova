// Static definitions ported verbatim from the Nova Flow prototype logic.

import type { IconName } from '../components/Icon'
import type { Block, Message } from '../state/types'

export type PresetId = 'code' | 'design' | 'research' | 'writing' | 'data'

export type ToolChipId = 'bash' | 'files' | 'fetch' | 'web'

export interface PresetDef {
  id: PresetId
  glyph: IconName
  color: string
  badgeBg: string
  /** tool chips shown on the card — translated via vocab.toolChips.* */
  tools: ToolChipId[]
}

export const presetDefs: PresetDef[] = [
  {
    id: 'code',
    glyph: 'command',
    color: 'var(--info)',
    badgeBg: 'rgba(59,91,169,.12)',
    tools: ['bash', 'files', 'fetch'],
  },
  {
    id: 'design',
    glyph: 'design',
    color: 'var(--plum)',
    badgeBg: 'rgba(154,91,138,.12)',
    tools: ['fetch', 'files'],
  },
  {
    id: 'research',
    glyph: 'search',
    color: 'var(--success)',
    badgeBg: 'rgba(62,138,94,.12)',
    tools: ['web', 'fetch'],
  },
  {
    id: 'writing',
    glyph: 'write',
    color: 'var(--accent)',
    badgeBg: 'var(--accent-soft)',
    tools: [],
  },
  {
    id: 'data',
    glyph: 'data',
    color: 'var(--warn)',
    badgeBg: 'rgba(181,133,63,.14)',
    tools: ['bash', 'files'],
  },
]

export type ProviderId = 'claude' | 'gemini' | 'openai' | 'ollama'
export type ProviderStatus = 'connected' | 'add' | 'local'

export interface ProviderDef {
  id: ProviderId
  name: string
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

// badge text is translated at consumption (vocab.status.*)
export const statusMap: Record<ProviderStatus, { fg: string; bg: string }> = {
  connected: { fg: 'var(--success-text)', bg: 'var(--success-bg)' },
  add: { fg: 'var(--warn-text)', bg: 'var(--warn-bg)' },
  local: { fg: 'var(--success-text)', bg: 'var(--success-bg)' },
}

export type SuggestionId = 'write' | 'plan' | 'learn' | 'docs'

export interface SuggestionDef {
  id: SuggestionId
  glyph: IconName
  bg: string
  fg: string
}

export const suggestionDefs: SuggestionDef[] = [
  { id: 'write', glyph: 'write', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  { id: 'plan', glyph: 'plan', bg: 'rgba(59,91,169,.12)', fg: 'var(--info)' },
  { id: 'learn', glyph: 'search', bg: 'rgba(62,138,94,.12)', fg: 'var(--success)' },
  { id: 'docs', glyph: 'file', bg: 'rgba(154,91,138,.12)', fg: 'var(--plum)' },
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

// seeded message history per conversation. c1 is the scripted showcase
// conversation, now stored as data (a full message log with tool-trace,
// table, sources and file blocks) and replayed by the generic renderer.
const msg = (
  id: string,
  role: Message['role'],
  who: string,
  blocks: Block[],
  extra: Partial<Message> = {},
): Message => ({ id, role, who, blocks, ...extra })

export const seedThreads: Record<string, Message[]> = {
  c1: [
    msg('c1-1', 'user', 'MINH', [
      {
        type: 'text',
        text: 'Xem giúp mình moodboard này có hợp với định vị Aurora không? Tham chiếu cả brief.',
      },
      {
        type: 'files',
        items: [
          { kind: 'image', name: 'moodboard.png', image: true, open: 'image' },
          { kind: 'pdf', name: 'Brief-Aurora.pdf', meta: '1.2 MB · 8 trang', open: 'pdf' },
        ],
      },
    ]),
    msg('c1-2', 'assistant', 'NOVA', [
      {
        type: 'text',
        size: 'lead',
        text: 'Moodboard nghiêng về tông ấm, thủ công — **hợp một nửa**. Định vị Aurora nhấn “tập trung, tối giản”, nên mình gợi ý giảm hoạ tiết và tăng khoảng trắng. Chi tiết khớp/lệch mình ghi trong nhận xét.',
      },
      {
        type: 'actions',
        items: [
          { icon: 'copy', label: 'Sao chép', action: 'copy' },
          { icon: 'open', label: 'Xem moodboard', action: 'image' },
        ],
      },
    ]),
    msg('c1-3', 'user', 'MINH', [
      {
        type: 'text',
        text: 'Giờ đối chiếu benchmark đối thủ với khảo sát của mình, rồi lưu bản tóm tắt vào *plan.md*.',
      },
    ]),
    msg(
      'c1-4',
      'assistant',
      'NOVA',
      [
        {
          type: 'trace',
          summary: 'Nova đã tra cứu web và cập nhật tài liệu của bạn',
          meta: '5 công cụ · 6.4 giây',
          steps: [
            { kind: 'think', text: 'Cần số liệu benchmark mới nhất trước khi so sánh. Tìm web đã.' },
            { kind: 'tool', node: 'accent', title: 'Tra cứu trên web', detail: '— benchmark ra mắt của đối thủ', tool: 'web_search', toolIcon: 'search', query: '"competitor launch benchmarks 2026"', result: '6 kết quả', resultTone: 'success' },
            { kind: 'tool', node: 'danger', title: '⚠ Một trang không tải được', detail: '— đã thử nguồn khác', tool: 'web_fetch', toolIcon: 'fetch', query: 'openview.dev/report', result: 'timeout · thử lại ✓', resultTone: 'danger' },
            { kind: 'quote', node: 'accent', title: 'Đọc một trang web', detail: '— techreview.io', quote: '“Đối thủ dẫn đầu đạt kích hoạt 38% trong 72 giờ đầu…”' },
            { kind: 'tool', node: 'accent', title: 'Mở tài liệu của bạn', detail: '— Khảo-sát.csv', tool: 'read_file', toolIcon: 'file', result: '412 dòng', resultTone: 'success' },
            { kind: 'code', node: 'accent', title: 'Chạy tính toán', detail: '— gộp & đối chiếu', code: ['$ python analyze.py --merge survey.csv bench.json', '✓ kích hoạt của mình: 29% (mục tiêu 38%)'] },
            { kind: 'tool', node: 'accent', title: 'Lưu vào tài liệu', detail: '— plan.md', tool: 'write_file', toolIcon: 'write', result: 'đã ghi · 2.1 KB', resultTone: 'success' },
            { kind: 'done', node: 'check', title: 'Hoàn tất', detail: '· 6.4 giây' },
          ],
        },
        {
          type: 'text',
          size: 'lead',
          text: 'Xong. Mình đã đối chiếu khảo sát với 6 đối thủ và lưu tóm tắt vào *plan.md*. Khoảng cách chính:',
        },
        {
          type: 'text',
          size: 'lead',
          text: '— Kích hoạt 72 giờ của mình **29%**, thấp hơn mức dẫn đầu **38%**.\n— Nguyên nhân: đăng ký nhiều bước. Đối thủ tốt nhất chỉ một bước.\n— Đề xuất: gộp đăng ký + thiết lập đầu thành một màn hình trước tuần ra mắt.',
        },
        {
          type: 'table',
          head: ['Nhóm', 'Kích hoạt 72h', 'Onboarding'],
          rows: [
            [{ text: 'Của mình' }, { text: '29%', tone: 'danger' }, { text: 'Nhiều bước' }],
            [{ text: 'Dẫn đầu' }, { text: '38%', tone: 'success' }, { text: 'Một bước' }],
            [{ text: 'TB ngành' }, { text: '33%' }, { text: '2–3 bước' }],
          ],
        },
        {
          type: 'sources',
          items: [
            { n: 1, label: 'techreview.io', open: 'pdf' },
            { n: 2, label: 'openview.dev', open: 'pdf' },
          ],
        },
        {
          type: 'actions',
          items: [
            { icon: 'copy', label: 'Sao chép', action: 'copy' },
            { icon: 'retry', label: 'Thử lại', action: 'retry' },
            { icon: 'open', label: 'Mở plan.md', action: 'md' },
          ],
        },
        {
          type: 'files',
          label: 'TỆP NOVA ĐÃ DÙNG',
          items: [
            { kind: 'md', name: 'plan.md', meta: '2.1 KB · vừa cập nhật', open: 'md' },
            { kind: 'code', name: 'analyze.py', meta: '1.4 KB', open: 'code' },
            { kind: 'csv', name: 'Khảo-sát.csv', meta: '18 KB · 412 dòng', open: 'csv' },
          ],
        },
      ],
      { approval: { tool: 'bash', command: 'python analyze.py --merge survey.csv bench.json' } },
    ),
  ],
  c2: [
    msg('c2-1', 'user', 'MINH', [
      { type: 'text', text: 'Viết giúp mình đoạn mở đầu cho trang đích Aurora.' },
    ]),
    msg('c2-2', 'assistant', 'NOVA', [
      {
        type: 'text',
        size: 'lead',
        text: 'Mình mở bằng một câu chốt định vị, rồi ba lợi ích ngắn. Bạn muốn giọng tự tin hay thân thiện?',
      },
    ]),
  ],
  c3: [
    msg('c3-1', 'user', 'MINH', [
      { type: 'text', text: 'Lên lịch nội dung sáu tuần trước ra mắt.' },
    ]),
    msg('c3-2', 'assistant', 'NOVA', [
      {
        type: 'text',
        size: 'lead',
        text: 'Mình chia theo ba giai đoạn: Định vị → Sản xuất → Ra mắt, mỗi tuần một chủ đề trục.',
      },
    ]),
  ],
  c4: [
    msg('c4-1', 'user', 'MINH', [
      { type: 'text', text: 'Tóm tắt khảo sát người dùng giúp mình.' },
    ]),
  ],
}
