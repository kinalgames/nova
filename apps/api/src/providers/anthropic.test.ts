import { describe, expect, it } from 'vitest'
import { anthropicBody, anthropicHeaders, toNovaStream } from './anthropic'

const profileKey = { kind: 'api_key' as const, credential: 'sk-ant-test' }
const profileAcc = { kind: 'account' as const, credential: 'sk-ant-oat01-token' }

describe('anthropic adapter — auth transport per credential kind', () => {
  it('api_key uses x-api-key (the supported path)', () => {
    const h = anthropicHeaders(profileKey)
    expect(h['x-api-key']).toBe('sk-ant-test')
    expect(h.authorization).toBeUndefined()
    expect(h['anthropic-version']).toBe('2023-06-01')
  })

  it('account (setup-token) uses Bearer + oauth beta flags + CLI identity', () => {
    const h = anthropicHeaders(profileAcc)
    expect(h.authorization).toBe('Bearer sk-ant-oat01-token')
    expect(h['anthropic-beta']).toContain('oauth-2025-04-20')
    expect(h['x-api-key']).toBeUndefined()
  })

  it('body carries the Claude Code identity block ONLY for account tokens, and never sampling params', () => {
    const req = {
      providerId: 'claude' as const,
      model: 'claude-sonnet-5',
      system: 'Chỉ dẫn dự án',
      messages: [{ role: 'user' as const, content: 'chào' }],
      profile: profileAcc,
    }
    const acc = JSON.parse(anthropicBody(req))
    expect(acc.system[0].text).toContain('Claude Code')
    expect(acc.system[1].text).toBe('Chỉ dẫn dự án')
    expect(acc.stream).toBe(true)
    expect(acc.temperature).toBeUndefined()
    expect(acc.top_p).toBeUndefined()

    const key = JSON.parse(anthropicBody({ ...req, profile: profileKey }))
    expect(key.system).toHaveLength(1)
    expect(key.system[0].text).toBe('Chỉ dẫn dự án')
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

describe('anthropic adapter — SSE transform to the Nova contract', () => {
  it('maps start/deltas/stop and carries real token usage', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'event: message_start',
          'data: {"type":"message_start","message":{"usage":{"input_tokens":12}}}',
          'data: {"type":"content_block_start","content_block":{"type":"text"}}',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Xin "}}',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"chào"}}',
          'data: {"type":"content_block_stop"}',
          'data: {"type":"message_delta","usage":{"output_tokens":7}}',
          'data: {"type":"message_stop"}',
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
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
  })

  it('surfaces upstream error events', async () => {
    const events = await collect(
      toNovaStream(
        sse(['data: {"type":"error","error":{"type":"overloaded_error","message":"busy"}}']),
      ),
    )
    expect(events[0]).toMatchObject({ type: 'error', code: 'overloaded_error', message: 'busy' })
  })
})
