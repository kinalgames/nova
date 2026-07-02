// Vietnamese demo seed bundle — the canonical showcase content.

import type { Block, Message } from '../state/types'
import type { SeedData } from './seed'

const msg = (
  id: string,
  role: Message['role'],
  who: string,
  blocks: Block[],
  extra: Partial<Message> = {},
): Message => ({ id, role, who, blocks, ...extra })

export const seedVi: SeedData = {
  projects: [
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
  ],
  convs: [
    { id: 'c1', title: 'Đối chiếu benchmark đối thủ', projectId: 'aurora', demo: true },
    { id: 'c2', title: 'Đoạn mở đầu trang đích', projectId: 'aurora' },
    { id: 'c3', title: 'Lịch nội dung 6 tuần', projectId: 'aurora' },
    { id: 'c4', title: 'Phân tích khảo sát', projectId: 'chung' },
  ],
  profiles: {
    claude: [
      { id: 'pf-claude-acc', name: 'Cá nhân', kind: 'account', credential: 'minh@studio.vn', status: 'active', demo: true },
      { id: 'pf-claude-key', name: 'Dự phòng', kind: 'api_key', credential: 'sk-ant-••••••••  4f2a', status: 'active', demo: true },
    ],
    gemini: [],
    openai: [
      { id: 'pf-openai-key', name: 'Khóa chính', kind: 'api_key', credential: 'sk-••••••••  9c1d', status: 'active', demo: true },
    ],
    ollama: [
      { id: 'pf-ollama', name: 'Máy này', kind: 'api_key', credential: 'http://localhost:11434', status: 'active', demo: true },
    ],
  },
  projectFiles: [
    { id: 'pjf-plan', kind: 'md', name: 'plan.md', meta: '2.1 KB · vừa cập nhật' },
    { id: 'pjf-brief', kind: 'pdf', name: 'Brief-Aurora.pdf', meta: '1.2 MB · 8 trang' },
    { id: 'pjf-survey', kind: 'csv', name: 'Khảo-sát.csv', meta: '18 KB · 412 dòng' },
  ],
  samples: {
    md: {
      type: 'text/markdown',
      body: '# Kế hoạch ra mắt Aurora\n\n## Khoảng cách kích hoạt\n- Kích hoạt 72 giờ: 29% (mục tiêu 38%)\n- Nguyên nhân: đăng ký nhiều bước\n- Hành động: gộp còn một bước trước ra mắt\n\n## Sáu tuần\nĐịnh vị → Sản xuất → Ra mắt & đo lường.\n',
    },
    csv: {
      type: 'text/csv',
      body: 'người dùng,kích hoạt 72h,kênh\nu_0142,có,email\nu_0143,không,ads\nu_0144,có,giới thiệu\n',
    },
    code: {
      type: 'text/x-python',
      body: 'import pandas as pd\n\nsurvey = pd.read_csv("survey.csv")\nbench  = pd.read_json("bench.json")\nact = survey["activated_72h"].mean()\nprint(f"kích hoạt: {act:.0%}")\n',
    },
    pdf: {
      type: 'text/plain',
      body: 'Aurora — Brief\nRa mắt sản phẩm · Q3 2026\n\nAurora là không gian làm việc AI một luồng, dành cho người làm việc sâu.\n',
    },
    image: { type: 'text/plain', body: 'moodboard.png — ảnh mẫu (demo).\n' },
  },
  previewMeta: {
    pdf: '8 trang · 1.2 MB',
    code: 'Python · 1.4 KB',
    csv: '412 dòng · 18 KB',
    md: 'Markdown · 2.1 KB',
  },
  previewNames: {
    pdf: 'Brief-Aurora.pdf',
    code: 'analyze.py',
    csv: 'Khảo-sát.csv',
    md: 'plan.md',
  },
  previewDocs: {
    pdf: {
      title: 'Aurora — Brief',
      meta: 'Ra mắt sản phẩm · Q3 2026',
      lead: 'Aurora là không gian làm việc AI một luồng, dành cho người làm việc sâu — gom mọi cuộc trò chuyện, tài liệu và công cụ vào một nơi tập trung.',
      page: 'trang 1 / 8',
    },
    code: { print: 'kích hoạt' },
    csv: {
      head: ['người dùng', 'kích hoạt 72h', 'kênh'],
      rows: [
        { id: 'u_0142', ok: true, okText: 'có', channel: 'email' },
        { id: 'u_0143', ok: false, okText: 'không', channel: 'ads' },
        { id: 'u_0144', ok: true, okText: 'có', channel: 'giới thiệu' },
      ],
    },
    md: {
      title: 'Kế hoạch ra mắt Aurora',
      gapHeading: 'Khoảng cách kích hoạt',
      bullets: [
        { pre: 'Kích hoạt 72 giờ: ', strong: '29%', tail: ' (mục tiêu 38%)' },
        { pre: 'Nguyên nhân: đăng ký nhiều bước' },
        { pre: 'Hành động: gộp còn một bước trước ra mắt' },
      ],
      sixHeading: 'Sáu tuần',
      sixBody: 'Định vị → Sản xuất → Ra mắt & đo lường.',
    },
  },
  replies: {
    templates: [
      {
        match: /code|lập trình|hàm|bug|lỗi|component|api|typescript|react/i,
        replies: [
          'Mình tách phần đó thành một hàm thuần để dễ test, rồi thêm guard cho các ca biên. Bạn muốn mình kèm cả unit test không?',
          'Gốc rễ là state được tính lại mỗi render. Mình bọc trong useMemo và rút phụ thuộc xuống còn những gì thực sự đổi — sẽ hết giật.',
          'Mình đề xuất tách interface trước, viết test đỏ, rồi mới cài đặt. Cách này giữ cho thay đổi nhỏ và an toàn.',
        ],
      },
      {
        match: /viết|email|bài|nội dung|content|soạn|draft/i,
        replies: [
          'Đây là bản nháp giữ giọng tự tin, không phô trương: mở bằng một câu chốt giá trị, ba ý chính, kết bằng lời mời hành động rõ ràng.',
          'Mình rút còn ba câu, mỗi câu một ý, bỏ các từ đệm. Bản ngắn thường được đọc hết — bạn muốn mình giữ độ dài này chứ?',
        ],
      },
      {
        match: /kế hoạch|plan|lịch|timeline|roadmap|bước/i,
        replies: [
          'Mình chia thành ba giai đoạn: Định vị → Sản xuất → Ra mắt & đo lường. Mỗi giai đoạn có một mốc cứng để không trượt lịch.',
          'Việc lớn nhất nên làm trước vì nó chặn các việc sau. Mình xếp theo phụ thuộc, không theo cảm hứng — gửi bạn thứ tự gợi ý.',
        ],
      },
      {
        match: /phân tích|số liệu|dữ liệu|báo cáo|benchmark|khảo sát|data/i,
        replies: [
          'Đối chiếu xong: chỉ số chính của bạn thấp hơn mức dẫn đầu một khoảng, nguyên nhân nằm ở bước onboarding nhiều tầng. Mình tóm tắt vào tài liệu nhé.',
          'Mình thấy một outlier kéo lệch trung bình — dùng trung vị sẽ phản ánh đúng hơn. Bạn muốn mình vẽ phân phối không?',
        ],
      },
    ],
    fallbacks: [
      'Đã rõ. Mình giữ đúng ngữ cảnh dự án {project} và làm tiếp phần này cho bạn.',
      'Được, mình xử lý ngay. Nếu cần mình sẽ hỏi lại thay vì đoán những chỗ chưa chắc.',
      'Mình hiểu ý bạn. Đây là hướng mình đề xuất, kèm lý do ngắn gọn để bạn dễ quyết.',
    ],
    smartSuffix: 'Mình cũng đã cân nhắc vài phương án khác và chọn cái đánh đổi tốt nhất cho bạn.',
    instructionsNote: '(Bám theo chỉ dẫn của dự án {project}.)',
  },
  quiet: {
    user: 'Viết phần Rủi ro cho kế hoạch — gọn, có cách giảm thiểu.',
    intro: 'Bốn rủi ro lớn nhất và cách giảm thiểu:',
    risks: [
      { t: 'Thông điệp loãng.', d: 'Chốt một câu định vị duy nhất.' },
      { t: 'Trễ nội dung.', d: 'Duyệt theo lô, deadline cứng.' },
      { t: 'Kênh phân tán.', d: 'Chọn đúng hai kênh.' },
      { t: 'Đo lường mơ hồ.', d: 'Định nghĩa “kích hoạt” trước.' },
    ],
  },
  threads: {
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
  },
}
