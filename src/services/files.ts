// Fake-but-real file actions: generate representative content for a previewed
// asset and actually download / open it (Blob + object URL), like production.

import type { PreviewKind } from '../state/types'

const SAMPLES: Record<PreviewKind, { type: string; body: string }> = {
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
}

export function previewSample(kind: PreviewKind): { type: string; body: string } {
  return SAMPLES[kind] ?? SAMPLES.md
}

function withObjectUrl(content: string, type: string, consume: (url: string) => void) {
  if (typeof URL === 'undefined' || !URL.createObjectURL) return
  const url = URL.createObjectURL(new Blob([content], { type }))
  consume(url)
  setTimeout(() => URL.revokeObjectURL?.(url), 0)
}

/** Trigger a real browser download of `content` as `name`. */
export function downloadFile(name: string, content: string, type: string) {
  withObjectUrl(content, type, (url) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  })
}

/** Open `content` in a new tab (blob URL). */
export function openFile(content: string, type: string) {
  withObjectUrl(content, type, (url) => window.open(url, '_blank', 'noopener'))
}
