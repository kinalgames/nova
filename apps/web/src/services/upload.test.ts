import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteFile, rejectUpload, uploadFile, IMAGE_MAX, DOC_MAX } from './upload'

afterEach(() => vi.unstubAllGlobals())

/** rejectUpload only reads name/type/size — a lean stand-in avoids
 *  allocating multi-megabyte buffers just to trip the caps */
const fakeFile = (name: string, type: string, size: number) => ({ name, type, size }) as File

describe('B1 — client-side upload validation', () => {
  it('accepts whitelisted images and documents', () => {
    expect(rejectUpload(fakeFile('a.png', 'image/png', 1000))).toBeNull()
    expect(rejectUpload(fakeFile('b.pdf', 'application/pdf', 1000))).toBeNull()
    expect(rejectUpload(fakeFile('c.ts', '', 1000))).toBeNull()
  })

  it('rejects foreign types and the caps, each with its own reason', () => {
    expect(rejectUpload(fakeFile('x.bmp', 'image/bmp', 10))).toBe('upload.unsupported')
    expect(rejectUpload(fakeFile('x.zip', 'application/zip', 10))).toBe('upload.unsupported')
    expect(rejectUpload(fakeFile('big.png', 'image/png', IMAGE_MAX + 1))).toBe(
      'upload.tooLargeImage',
    )
    expect(rejectUpload(fakeFile('big.pdf', 'application/pdf', DOC_MAX + 1))).toBe(
      'upload.tooLargeDoc',
    )
  })
})

describe('B1 — deleteFile cleanup', () => {
  it('DELETEs by id with the bearer and fails soft', async () => {
    localStorage.setItem('nova.auth.token', 'tok-9')
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await deleteFile('f-1')).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/files/f-1')
    expect(init.method).toBe('DELETE')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-9')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    expect(await deleteFile('f-1')).toBe(false)
    localStorage.removeItem('nova.auth.token')
  })
})

/** a controllable XMLHttpRequest stand-in — fetch still has no upload progress */
class FakeXHR {
  static last: FakeXHR | null = null
  status = 0
  responseText = ''
  withCredentials = false
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  headers: Record<string, string> = {}
  open() {
    FakeXHR.last = this
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v
  }
  send() {}
}

describe('B1 — uploadFile over XHR', () => {
  it('reports progress and resolves the stored metadata', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    localStorage.setItem('nova.auth.token', 'tok-1')
    const seen: number[] = []
    const p = uploadFile(new File(['x'], 'a.png', { type: 'image/png' }), (pct) => seen.push(pct))
    const xhr = FakeXHR.last!
    expect(xhr.headers.authorization).toBe('Bearer tok-1')
    expect(xhr.headers['x-file-name']).toBe('a.png')
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 })
    xhr.status = 200
    xhr.responseText = JSON.stringify({ id: 'f1', name: 'a.png', kind: 'image', size: 1, mime: 'image/png' })
    xhr.onload?.()
    expect(await p).toMatchObject({ id: 'f1' })
    expect(seen).toEqual([50])
    localStorage.removeItem('nova.auth.token')
  })

  it('omits the bearer without a session, defaults the mime, ignores unsized progress', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    const seen: number[] = []
    const p = uploadFile(new File(['x'], 'noext-name'), (pct) => seen.push(pct))
    const xhr = FakeXHR.last!
    expect(xhr.headers.authorization).toBeUndefined()
    expect(xhr.headers['content-type']).toBe('application/octet-stream')
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 })
    xhr.status = 200
    xhr.responseText = JSON.stringify({ id: 'f2', name: 'noext-name', kind: 'code', size: 1, mime: '' })
    xhr.onload?.()
    expect(await p).toMatchObject({ id: 'f2' })
    expect(seen).toEqual([])
  })

  it('resolves null on a server error, a broken body, or a network failure', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    const fail = uploadFile(new File(['x'], 'a.png', { type: 'image/png' }), () => {})
    FakeXHR.last!.status = 413
    FakeXHR.last!.onload?.()
    expect(await fail).toBeNull()

    const broken = uploadFile(new File(['x'], 'a.png', { type: 'image/png' }), () => {})
    FakeXHR.last!.status = 200
    FakeXHR.last!.responseText = 'not-json'
    FakeXHR.last!.onload?.()
    expect(await broken).toBeNull()

    const network = uploadFile(new File(['x'], 'a.png', { type: 'image/png' }), () => {})
    FakeXHR.last!.onerror?.()
    expect(await network).toBeNull()
  })
})
