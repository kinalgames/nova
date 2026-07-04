// Real file actions: classify uploads, download / open content the app
// actually holds (Blob + object URL) — never generated stand-in bodies.

import type { PreviewKind } from '../state/types'

function withObjectUrl(content: string, type: string, consume: (url: string) => void) {
  if (typeof URL === 'undefined' || !URL.createObjectURL) return
  const url = URL.createObjectURL(new Blob([content], { type }))
  consume(url)
  setTimeout(() => URL.revokeObjectURL?.(url), 0)
}

/** classify an uploaded File: preview kind, display size, object URL for images */
export function describeUpload(file: File): { kind: PreviewKind; size: string; url?: string } {
  const isImg = file.type.startsWith('image/')
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  let kind: PreviewKind = 'pdf'
  if (isImg) kind = 'image'
  else if (ext === 'pdf') kind = 'pdf'
  else if (['py', 'js', 'ts', 'tsx', 'json', 'sh'].includes(ext)) kind = 'code'
  else if (ext === 'csv') kind = 'csv'
  else if (ext === 'md') kind = 'md'
  const url = isImg ? URL.createObjectURL(file) : undefined
  const size =
    file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`
  return { kind, size, url }
}

/** Trigger a browser download of an already-materialized URL as `name`. */
export function downloadUrl(name: string, url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Trigger a real browser download of `content` as `name`. */
export function downloadFile(name: string, content: string, type: string) {
  withObjectUrl(content, type, (url) => downloadUrl(name, url))
}

