import { describe, expect, it } from 'vitest'
import { anthropicBody, anthropicHeaders, anthropicTools, toNovaStream } from './anthropic'

const profileKey = { kind: 'api_key' as const, credential: 'sk-ant-test' }
const profileAcc = { kind: 'account' as const, credential: 'sk-ant-oat01-token' }

describe('B1 — binary parts render as native blocks', () => {
  it('images and PDFs precede the text block; plain turns stay strings', () => {
    const body = JSON.parse(
      anthropicBody({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [
          {
            role: 'user',
            content: 'phân tích ảnh',
            parts: [
              { type: 'image', name: 'a.png', mime: 'image/png', base64: 'QUJD' },
              { type: 'pdf', name: 'p.pdf', base64: 'UERG' },
            ],
          },
          { role: 'assistant', content: 'đây là kết quả' },
        ],
        profile: profileKey,
      }),
    )
    const [withParts, plain] = body.messages
    expect(withParts.content).toHaveLength(3)
    expect(withParts.content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'QUJD' },
    })
    expect(withParts.content[1].type).toBe('document')
    expect(withParts.content[2]).toEqual({ type: 'text', text: 'phân tích ảnh' })
    expect(plain.content).toBe('đây là kết quả')
  })

  it('T4.5 — URL parts render as url sources (Anthropic fetches the bytes)', () => {
    const body = JSON.parse(
      anthropicBody({
        providerId: 'claude',
        model: 'claude-sonnet-5',
        messages: [
          {
            role: 'user',
            content: 'xem giúp',
            parts: [
              { type: 'image', name: 'a.png', mime: 'image/png', url: 'https://n.vn/s/1?sig=x' },
              { type: 'pdf', name: 'p.pdf', url: 'https://n.vn/s/2?sig=y' },
            ],
          },
        ],
        profile: profileKey,
      }),
    )
    expect(body.messages[0].content[0]).toEqual({
      type: 'image',
      source: { type: 'url', url: 'https://n.vn/s/1?sig=x' },
    })
    expect(body.messages[0].content[1]).toEqual({
      type: 'document',
      source: { type: 'url', url: 'https://n.vn/s/2?sig=y' },
    })
  })
})

describe('B5 — thinking mapping per model generation', () => {
  const base = {
    providerId: 'claude' as const,
    messages: [{ role: 'user' as const, content: 'chào' }],
    profile: profileKey,
  }

  it('adaptive generations take thinking.adaptive + output_config.effort', () => {
    const high = JSON.parse(
      anthropicBody({ ...base, model: 'claude-opus-4-8', thinking: 'high' as const }),
    )
    expect(high.thinking).toEqual({ type: 'adaptive' })
    expect(high.output_config).toEqual({ effort: 'high' })
    const normal = JSON.parse(
      anthropicBody({ ...base, model: 'claude-sonnet-5', thinking: 'normal' as const }),
    )
    expect(normal.output_config.effort).toBe('medium')
    expect(normal.thinking.budget_tokens).toBeUndefined()
  })

  it('budget generations take enabled + budget_tokens kept below max_tokens', () => {
    const low = JSON.parse(
      anthropicBody({ ...base, model: 'claude-haiku-4-5', thinking: 'low' as const }),
    )
    expect(low.thinking).toEqual({ type: 'enabled', budget_tokens: 2048 })
    expect(low.output_config).toBeUndefined()
    expect(low.max_tokens).toBeGreaterThan(2048)
    const high = JSON.parse(
      anthropicBody({ ...base, model: 'claude-haiku-4-5', thinking: 'high' as const }),
    )
    expect(high.thinking.budget_tokens).toBe(16384)
    expect(high.max_tokens).toBeGreaterThan(16384)
  })

  it("'off' and absent send no thinking at all — the provider default", () => {
    const off = JSON.parse(
      anthropicBody({ ...base, model: 'claude-opus-4-8', thinking: 'off' as const }),
    )
    expect(off.thinking).toBeUndefined()
    expect(off.output_config).toBeUndefined()
    const absent = JSON.parse(anthropicBody({ ...base, model: 'claude-haiku-4-5' }))
    expect(absent.thinking).toBeUndefined()
    expect(absent.max_tokens).toBe(8192)
  })
})

describe('D1 — native server tools ride the request', () => {
  const base = {
    providerId: 'claude' as const,
    model: 'claude-sonnet-5',
    messages: [{ role: 'user' as const, content: 'giá vàng hôm nay?' }],
    profile: profileKey,
  }

  it('search/fetch flags declare capped tools; absent flags send none', () => {
    expect(anthropicTools({})).toEqual([])
    const body = JSON.parse(anthropicBody({ ...base, search: true, fetch: true }))
    expect(body.tools).toEqual([
      { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
      { type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 5 },
    ])
    expect(JSON.parse(anthropicBody(base)).tools).toBeUndefined()
  })

  it('the web_fetch beta header rides only when the fetch tool is on', () => {
    expect(anthropicHeaders(profileKey, { fetchTool: true })['anthropic-beta']).toBe(
      'web-fetch-2025-09-10',
    )
    expect(anthropicHeaders(profileKey)['anthropic-beta']).toBeUndefined()
    // account credentials keep their oauth betas and append the fetch flag
    const acc = anthropicHeaders(profileAcc, { fetchTool: true })['anthropic-beta']
    expect(acc).toBe('oauth-2025-04-20,claude-code-20250219,web-fetch-2025-09-10')
  })
})

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

  it('meters prompt-cache tokens — they live OUTSIDE input_tokens', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"message_start","message":{"usage":{"input_tokens":10,"cache_creation_input_tokens":100,"cache_read_input_tokens":40}}}',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}',
          'data: {"type":"message_delta","usage":{"output_tokens":3}}',
          'data: {"type":"message_stop"}',
        ]),
      ),
    )
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 150, outputTokens: 3 })
  })

  it('surfaces upstream error events', async () => {
    const events = await collect(
      toNovaStream(
        sse(['data: {"type":"error","error":{"type":"overloaded_error","message":"busy"}}']),
      ),
    )
    expect(events[0]).toMatchObject({ type: 'error', code: 'overloaded_error', message: 'busy' })
  })

  it('maps server_tool_use blocks to tool events with numbered sources', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"message_start","message":{"usage":{"input_tokens":4}}}',
          'data: {"type":"content_block_start","content_block":{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search"}}',
          'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{\\"query\\":"}}',
          'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"\\"giá vàng\\"}"}}',
          'data: {"type":"content_block_stop"}',
          'data: {"type":"content_block_start","content_block":{"type":"web_search_tool_result","tool_use_id":"srvtoolu_1","content":[{"type":"web_search_result","url":"https://a.vn/gia","title":"Giá vàng"},{"type":"web_search_result","url":"https://b.vn","title":"B"}]}}',
          'data: {"type":"content_block_stop"}',
          'data: {"type":"content_block_start","content_block":{"type":"text"}}',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Theo [1]…"}}',
          'data: {"type":"message_delta","usage":{"output_tokens":20}}',
          'data: {"type":"message_stop"}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'tool_start',
      'tool_delta',
      'tool_delta',
      'tool_result',
      'block_delta',
      'message_stop',
    ])
    expect(events[1]).toMatchObject({ id: 'srvtoolu_1', name: 'web_search' })
    expect(events[4]).toMatchObject({
      id: 'srvtoolu_1',
      ok: true,
      sources: [
        { n: 1, url: 'https://a.vn/gia', title: 'Giá vàng' },
        { n: 2, url: 'https://b.vn', title: 'B' },
      ],
    })
  })

  it('a tool-result ERROR surfaces ok:false; stray json deltas outside a tool never leak', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"content_block_start","content_block":{"type":"web_fetch_tool_result","tool_use_id":"srvtoolu_9","content":{"type":"web_fetch_tool_result_error","error_code":"url_not_accessible"}}}',
          'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{}"}}',
          'data: {"type":"message_stop"}',
        ]),
      ),
    )
    const types = events.map((e) => e.type)
    expect(types).not.toContain('tool_delta')
    expect(events.find((e) => e.type === 'tool_result')).toMatchObject({
      id: 'srvtoolu_9',
      ok: false,
      summary: 'url_not_accessible',
    })
  })

  it('streams extended-thinking deltas as thinking_delta and drops signatures', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}',
          'data: {"type":"content_block_start","content_block":{"type":"thinking"}}',
          'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"So sánh hai phương án…"}}',
          'data: {"type":"content_block_delta","delta":{"type":"signature_delta","signature":"c2ln"}}',
          'data: {"type":"content_block_stop"}',
          'data: {"type":"content_block_start","content_block":{"type":"text"}}',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Kết luận"}}',
          'data: {"type":"message_delta","usage":{"output_tokens":9}}',
          'data: {"type":"message_stop"}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'thinking_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events[1].text).toBe('So sánh hai phương án…')
  })
})
