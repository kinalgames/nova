// B1 — real attachment upload with progress. XHR because fetch still has no
// upload-progress events; the response is the API's attachment metadata.

import { API_BASE } from './llm'
import { getToken } from './token'

export const IMAGE_MAX = 5 * 1024 * 1024
export const DOC_MAX = 10 * 1024 * 1024
/** product cap: at most 4 attachments ride with one message */
export const MAX_FILES = 4

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const TEXT_EXT = new Set(['txt', 'md', 'csv', 'json', 'py', 'js', 'ts', 'tsx', 'sh', 'pdf'])

export type UploadReject = 'upload.unsupported' | 'upload.tooLargeImage' | 'upload.tooLargeDoc'

/** i18n key of the reason this file can never upload — null when it can */
export function rejectUpload(file: File): UploadReject | null {
  const isImage = file.type.startsWith('image/')
  if (isImage && !IMAGE_MIME.has(file.type)) return 'upload.unsupported'
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!isImage && !TEXT_EXT.has(ext)) return 'upload.unsupported'
  if (isImage && file.size > IMAGE_MAX) return 'upload.tooLargeImage'
  if (!isImage && file.size > DOC_MAX) return 'upload.tooLargeDoc'
  return null
}

export interface UploadedFile {
  id: string
  name: string
  kind: string
  size: number
  mime: string
}

/** resolves to the stored metadata, or null on any failure (fail-soft) */
export function uploadFile(
  file: File,
  onProgress: (pct: number) => void,
): Promise<UploadedFile | null> {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/v1/files`)
      const token = getToken()
      if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`)
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name))
      xhr.setRequestHeader('content-type', file.type || 'application/octet-stream')
      xhr.withCredentials = true
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        try {
          resolve(
            xhr.status >= 200 && xhr.status < 300
              ? (JSON.parse(xhr.responseText) as UploadedFile)
              : null,
          )
        } catch {
          resolve(null)
        }
      }
      xhr.onerror = () => resolve(null)
      xhr.send(file)
    } catch {
      resolve(null)
    }
  })
}
