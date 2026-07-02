// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamChat, type StreamHandlers } from './llm'

afterEach(() => vi.unstubAllGlobals())

const req = {
  providerId: 'claude' as const,
  model: 'claude-haiku-4-5',
  messages: [{ role: 'user' as const, content: 'hi' }],
  profile: { kind: 'api_key' as const, credential: 'sk-x' },
}

function handlers() {
  return {
    deltas: [] as string[],
    usage: null as { inputTokens: number; outputTokens: number } | null,
    errors: [] as string[],
    h: null as unknown as StreamHandlers,
  }
}

function make() {
  const s = handlers()
  s.h = {
    onDelta: (t) => s.deltas.push(t),
    onDone: (u) => (s.usage = u),
    onError: (code) => s.errors.push(code),
  }
  return s
}

const sseResponse = (frames: string[]) => {
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const f of frames) c.enqueue(enc.encode(f))
      c.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('llm service — SSE client', () => {
  it('parses deltas across chunk boundaries and finishes with usage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'data: {"type":"message_start"}\n\ndata: {"type":"block_delta","te',
          'xt":"Xin "}\n\ndata: {"type":"block_delta","text":"chào"}\n\n',
          'data: {"type":"message_stop","usage":{"inputTokens":5,"outputTokens":2}}\n\n',
        ]),
      ),
    )
    const s = make()
    await streamChat(req, s.h)
    expect(s.deltas.join('')).toBe('Xin chào')
    expect(s.usage).toEqual({ inputTokens: 5, outputTokens: 2 })
    expect(s.errors).toHaveLength(0)
  })

  it('maps an HTTP error body to onError with the retry-after window', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 'rate_limited', detail: 'slow down' }), {
            status: 429,
            headers: { 'retry-after': '30', 'content-type': 'application/json' },
          }),
      ),
    )
    const s = make()
    const seen: unknown[] = []
    s.h.onError = (...args) => seen.push(args)
    await streamChat(req, s.h)
    expect(seen[0]).toEqual(['rate_limited', 'slow down', 429, 30])
  })

  it('an error body that is not JSON falls back to status text defaults', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>oops</html>', { status: 500, statusText: 'Server Error' })),
    )
    const s = make()
    const seen: unknown[] = []
    s.h.onError = (...args) => seen.push(args)
    await streamChat(req, s.h)
    expect(seen[0]).toEqual(['upstream_error', 'Server Error', 500, undefined])
  })

  it('a bare message_stop (no usage payload) defaults to zero counts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseResponse(['data: {"type":"message_stop"}\n\n'])),
    )
    const s = make()
    await streamChat(req, s.h)
    expect(s.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
  })

  it('a 200 without a body reports empty_stream', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toEqual(['empty_stream'])
  })

  it('reports network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toEqual(['network'])
  })

  it('surfaces in-stream provider errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseResponse(['data: {"type":"error","code":"overloaded","message":"busy"}\n\n'])),
    )
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toEqual(['overloaded'])
  })

  it('skips malformed frames instead of dying', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'data: {not-json\n\n',
          'data: {"type":"block_delta"}\n\n',
          ': comment frame\n\n',
          'data: {"type":"message_stop","usage":{"inputTokens":1,"outputTokens":1}}\n\n',
        ]),
      ),
    )
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toHaveLength(0)
    expect(s.usage).toEqual({ inputTokens: 1, outputTokens: 1 })
  })

  it('an aborted fetch is silent — no error surfaces', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(abortErr)))
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toHaveLength(0)
  })

  it('an abort mid-stream is silent too', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw abortErr
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { status: 200 })))
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toHaveLength(0)
    expect(s.usage).toBeNull()
  })

  it('an error event without code/message falls back to the defaults', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(['data: {"type":"error"}\n\n'])))
    const s = make()
    const seen: unknown[] = []
    s.h.onError = (...args) => seen.push(args)
    await streamChat(req, s.h)
    expect(seen[0]).toEqual(['stream_error', 'Stream lỗi'])
  })

  it('a non-abort read failure surfaces stream_read', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('boom')
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { status: 200 })))
    const s = make()
    await streamChat(req, s.h)
    expect(s.errors).toEqual(['stream_read'])
  })

  it('a stream that ends without message_stop still resolves as done', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseResponse(['data: {"type":"block_delta","text":"nửa chừng"}\n\n'])),
    )
    const s = make()
    await streamChat(req, s.h)
    expect(s.deltas).toEqual(['nửa chừng'])
    expect(s.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
  })
})