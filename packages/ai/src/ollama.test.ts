import { afterEach, describe, expect, it, vi } from 'vitest'
import { callOllama, ollamaBody, ollamaEndpoint, toNovaStream } from './ollama'
import { ProviderConfigError } from './shared'

afterEach(() => vi.unstubAllGlobals())

const baseReq = {
  providerId: 'ollama' as const,
  model: 'llama3.2',
  system: 'Chỉ dẫn dự án',
  messages: [{ role: 'user' as const, content: 'chào' }],
  profile: { kind: 'api_key' as const, credential: 'http://localhost:11434' },
}

describe('ollama adapter — endpoint credential', () => {
  it('normalizes trailing slashes', () => {
    expect(ollamaEndpoint('http://localhost:11434/')).toBe('http://localhost:11434')
    expect(ollamaEndpoint('https://ollama.lan/prefix//')).toBe('https://ollama.lan/prefix')
  })

  it('rejects non-URLs and non-http schemes as a config error', () => {
    expect(() => ollamaEndpoint('not a url')).toThrow(ProviderConfigError)
    expect(() => ollamaEndpoint('file:///etc/passwd')).toThrow(ProviderConfigError)
    expect(() => ollamaEndpoint('')).toThrow(ProviderConfigError)
  })

  it('POSTs to {endpoint}/api/chat', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await callOllama(baseReq)
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/chat')
  })
})

describe('ollama adapter — request body', () => {
  it('carries system + turns, streaming, and num_predict', () => {
    const body = JSON.parse(ollamaBody(baseReq)) as Record<string, unknown>
    expect(body.model).toBe('llama3.2')
    expect(body.messages).toEqual([
      { role: 'system', content: 'Chỉ dẫn dự án' },
      { role: 'user', content: 'chào' },
    ])
    expect(body.stream).toBe(true)
    expect(body.options).toEqual({ num_predict: 8192 })
    // no thinking knob on the request → the body never mentions think
    expect('think' in body).toBe(false)
  })

  it('B6b — maps the thinking level onto ollama `think` (off must be false)', () => {
    const off = JSON.parse(ollamaBody({ ...baseReq, thinking: 'off' })) as Record<string, unknown>
    expect(off.think).toBe(false)
    const high = JSON.parse(ollamaBody({ ...baseReq, thinking: 'high' })) as Record<string, unknown>
    expect(high.think).toBe(true)
  })
})

function ndjson(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l + '\n'))
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text()
  return text
    .split('\n\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)) as Record<string, unknown>)
}

describe('ollama adapter — NDJSON transform to the Nova contract', () => {
  it('maps deltas and the done line with eval counts as usage', async () => {
    const events = await collect(
      toNovaStream(
        ndjson([
          '{"model":"llama3.2","message":{"role":"assistant","content":"Xin "},"done":false}',
          '{"model":"llama3.2","message":{"role":"assistant","content":"chào"},"done":false}',
          '{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true,"prompt_eval_count":7,"eval_count":4}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'block_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 7, outputTokens: 4 })
  })

  it('surfaces the error line and suppresses the stop event', async () => {
    const events = await collect(
      toNovaStream(ndjson(['{"error":"model \\"nope\\" not found"}'])),
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'error', code: 'upstream_error' })
  })

  it('closes the contract when the stream ends without a done line', async () => {
    const events = await collect(
      toNovaStream(ndjson(['{"message":{"content":"nửa chừng"},"done":false}'])),
    )
    expect(events.map((e) => e.type)).toEqual(['message_start', 'block_delta', 'message_stop'])
  })

  it('T5 — captures tool_calls, synthesizes ids, and builds the tool tail', async () => {
    const { ollamaToolTail } = await import('./ollama')
    const round = { calls: [] as { id: string; name: string; args: string }[] } as import('./shared').RoundCapture
    const events = await collect(
      toNovaStream(
        ndjson([
          '{"message":{"role":"assistant","content":"","tool_calls":[{"function":{"name":"files","arguments":{"op":"list"}}}]},"done":false}',
          '{"message":{"content":""},"done":true,"prompt_eval_count":4,"eval_count":2}',
        ]),
        round,
      ),
    )
    expect(round.calls).toEqual([{ id: 'oll-1', name: 'files', args: '{"op":"list"}' }])
    expect(events.find((e) => e.type === 'tool_start')).toMatchObject({ id: 'oll-1', name: 'files' })
    expect(round.assistantTurn).toMatchObject({
      role: 'assistant',
      tool_calls: [{ function: { name: 'files', arguments: { op: 'list' } } }],
    })
    const tail = ollamaToolTail(round, [{ ok: true, content: '2 tệp' }])
    expect(tail[1]).toEqual({ role: 'tool', tool_name: 'files', content: '2 tệp' })
  })

  it('streams message.thinking chunks as thinking_delta ahead of the reply', async () => {
    const events = await collect(
      toNovaStream(
        ndjson([
          '{"message":{"role":"assistant","thinking":"Phân tích yêu cầu…","content":""},"done":false}',
          '{"message":{"role":"assistant","content":"Xong rồi"},"done":false}',
          '{"message":{"content":""},"done":true,"prompt_eval_count":6,"eval_count":9}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'thinking_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events[1].text).toBe('Phân tích yêu cầu…')
  })
})
