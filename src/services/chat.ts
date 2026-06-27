// Fake "assistant" service — deterministic-ish but varied replies that behave
// like a real streaming chat backend (no network). Keeps the UI honest: the
// composer drives real exchanges, streamed token-by-token.

import type { ModelId, ThinkLevel } from '../state/types'

export interface ReplyOptions {
  model: ModelId
  thinking: ThinkLevel
  project: string
}

const TEMPLATES: { match: RegExp; replies: string[] }[] = [
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
]

const FALLBACKS = [
  'Đã rõ. Mình giữ đúng ngữ cảnh dự án {project} và làm tiếp phần này cho bạn.',
  'Được, mình xử lý ngay. Nếu cần mình sẽ hỏi lại thay vì đoán những chỗ chưa chắc.',
  'Mình hiểu ý bạn. Đây là hướng mình đề xuất, kèm lý do ngắn gọn để bạn dễ quyết.',
]

let seed = 1
function pick<T>(arr: T[]): T {
  // tiny LCG so replies vary across calls but stay deterministic within a run
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return arr[seed % arr.length]
}

/** Reset the variation seed (tests want determinism). */
export function resetReplySeed(s = 1) {
  seed = s
}

/** Compose a contextual reply for a user message. */
export function composeReply(userText: string, opts: ReplyOptions): string {
  const group = TEMPLATES.find((t) => t.match.test(userText))
  let body = group ? pick(group.replies) : pick(FALLBACKS)
  body = body.replace('{project}', opts.project)
  // "Thông minh" answers a touch more thoroughly than "Nhanh"
  if (opts.model === 'opus' && opts.thinking !== 'off') {
    body += ' Mình cũng đã cân nhắc vài phương án khác và chọn cái đánh đổi tốt nhất cho bạn.'
  }
  return body
}

/** ms the assistant "thinks" before the first token, by thinking level. */
export function thinkingDelay(level: ThinkLevel): number {
  return { off: 0, low: 280, normal: 650, high: 1200 }[level]
}

/** ms between streamed words, by model (Nhanh streams faster). */
export function tokenInterval(model: ModelId): number {
  return model === 'haiku' ? 16 : 32
}
