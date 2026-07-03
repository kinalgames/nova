import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  callOpenAI,
  openaiBody,
  openaiHeaders,
  openaiReasoningEffort,
  toNovaStream,
} from './openai'

describe('B5 — reasoning_effort per level and model', () => {
  it('levels map to low/medium/high on reasoning models', () => {
    expect(openaiReasoningEffort({ model: 'gpt-5', thinking: 'low' })).toBe('low')
    expect(openaiReasoningEffort({ model: 'gpt-5-mini', thinking: 'normal' })).toBe('medium')
    expect(openaiReasoningEffort({ model: 'o3', thinking: 'high' })).toBe('high')
  })

  it("'off' becomes minimal on gpt-5 but is omitted on o-series and absent", () => {
    expect(openaiReasoningEffort({ model: 'gpt-5', thinking: 'off' })).toBe('minimal')
    expect(openaiReasoningEffort({ model: 'o3', thinking: 'off' })).toBeNull()
    expect(openaiReasoningEffort({ model: 'gpt-5' })).toBeNull()
  })

  it('non-reasoning models never receive the param (they reject it)', () => {
    expect(openaiReasoningEffort({ model: 'gpt-4.1', thinking: 'high' })).toBeNull()
    const body = JSON.parse(
      openaiBody({
        providerId: 'openai',
        model: 'gpt-5',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'sk-o' },
        thinking: 'high',
      }),
    )
    expect(body.reasoning_effort).toBe('high')
  })
})

afterEach(() => vi.unstubAllGlobals())

const baseReq = {
  providerId: 'openai' as const,
  model: 'gpt-5-mini',
  system: 'Chỉ dẫn dự án',
  messages: [{ role: 'user' as const, content: 'chào' }],
  profile: { kind: 'api_key' as const, credential: 'sk-test' },
}

describe('openai adapter — auth transport', () => {
  it('uses Authorization: Bearer with the api key', () => {
    const h = openaiHeaders(baseReq.profile)
    expect(h.authorization).toBe('Bearer sk-test')
    expect(h['content-type']).toBe('application/json')
  })

  it('POSTs to the chat completions endpoint', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await callOpenAI(baseReq)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions')
  })
})

describe('openai adapter — request body', () => {
  it('prepends the system turn, streams with usage, and uses max_completion_tokens', () => {
    const body = JSON.parse(openaiBody(baseReq)) as Record<string, unknown>
    expect(body.model).toBe('gpt-5-mini')
    expect(body.messages).toEqual([
      { role: 'system', content: 'Chỉ dẫn dự án' },
      { role: 'user', content: 'chào' },
    ])
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })
    // reasoning models (gpt-5/o-series) reject max_tokens and sampling params
    expect(body.max_completion_tokens).toBe(8192)
    expect(body.max_tokens).toBeUndefined()
    expect(body.temperature).toBeUndefined()
  })

  it('omits the system turn when absent and honors maxTokens', () => {
    const body = JSON.parse(openaiBody({ ...baseReq, system: '  ', maxTokens: 32 })) as Record<
      string,
      unknown
    >
    expect(body.messages).toEqual([{ role: 'user', content: 'chào' }])
    expect(body.max_completion_tokens).toBe(32)
  })
})

function sse(lines: string[]): ReadableStream<Uint8Array> {
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

describe('openai adapter — SSE transform to the Nova contract', () => {
  it('maps deltas and the trailing usage chunk into message_stop', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"choices":[{"delta":{"role":"assistant","content":""},"index":0}]}',
          'data: {"choices":[{"delta":{"content":"Xin "},"index":0}]}',
          'data: {"choices":[{"delta":{"content":"chào"},"index":0}]}',
          'data: {"choices":[{"delta":{},"finish_reason":"stop","index":0}]}',
          'data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":6,"total_tokens":17}}',
          'data: [DONE]',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'block_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events[1].text).toBe('Xin ')
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 11, outputTokens: 6 })
  })

  it('surfaces in-stream error payloads and suppresses the stop event', async () => {
    const events = await collect(
      toNovaStream(
        sse(['data: {"error":{"message":"insufficient quota","type":"insufficient_quota"}}']),
      ),
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'error',
      code: 'insufficient_quota',
      message: 'insufficient quota',
    })
  })

  it('ignores malformed lines and still closes the contract', async () => {
    const events = await collect(toNovaStream(sse(['data: {broken', ': ping'])))
    expect(events.map((e) => e.type)).toEqual(['message_stop'])
  })
})
