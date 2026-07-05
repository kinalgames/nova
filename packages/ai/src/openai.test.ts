import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  callOpenAI,
  openaiBody,
  openaiHeaders,
  openaiReasoningEffort,
  toNovaStream,
} from './openai'

describe('B1 — images as input_image data URLs, PDFs degrade into a note', () => {
  it('builds multimodal input content only when images exist', () => {
    const body = JSON.parse(
      openaiBody({
        providerId: 'openai',
        model: 'gpt-5.5',
        messages: [
          {
            role: 'user',
            content: 'so sánh',
            parts: [
              { type: 'image', name: 'a.png', mime: 'image/png', base64: 'QUJD' },
              { type: 'pdf', name: 'plan.pdf', base64: 'UERG' },
            ],
          },
        ],
        profile: { kind: 'api_key', credential: 'sk-o' },
      }),
    )
    const msg = body.input[0]
    expect(msg.content[0]).toEqual({
      type: 'input_image',
      image_url: 'data:image/png;base64,QUJD',
    })
    expect(msg.content[1].type).toBe('input_text')
    expect(msg.content[1].text).toContain('[attached: plan.pdf — not readable by this model]')
    expect(msg.content[1].text).toContain('so sánh')
  })

  it('T4.5 — an image with a signed URL rides as-is (no base64 inflation)', () => {
    const body = JSON.parse(
      openaiBody({
        providerId: 'openai',
        model: 'gpt-5.5',
        messages: [
          {
            role: 'user',
            content: 'xem ảnh',
            parts: [{ type: 'image', name: 'a.png', mime: 'image/png', url: 'https://n.vn/s/1?sig=x' }],
          },
        ],
        profile: { kind: 'api_key', credential: 'sk-o' },
      }),
    )
    expect(body.input[0].content[0]).toEqual({
      type: 'input_image',
      image_url: 'https://n.vn/s/1?sig=x',
    })
  })
})

describe('B5 — reasoning effort per level and model', () => {
  it('levels map to low/medium/high on reasoning models', () => {
    expect(openaiReasoningEffort({ model: 'gpt-5.5', thinking: 'low' })).toBe('low')
    expect(openaiReasoningEffort({ model: 'gpt-5.4-mini', thinking: 'normal' })).toBe('medium')
    expect(openaiReasoningEffort({ model: 'o3', thinking: 'high' })).toBe('high')
  })

  it("'off' becomes minimal on gpt-5 but is omitted on o-series and absent", () => {
    expect(openaiReasoningEffort({ model: 'gpt-5.5', thinking: 'off' })).toBe('minimal')
    expect(openaiReasoningEffort({ model: 'o3', thinking: 'off' })).toBeNull()
    expect(openaiReasoningEffort({ model: 'gpt-5.5' })).toBeNull()
  })

  it('reasoning rides as {effort, summary:auto}; non-reasoning models never see it', () => {
    expect(openaiReasoningEffort({ model: 'gpt-4.1', thinking: 'high' })).toBeNull()
    const body = JSON.parse(
      openaiBody({
        providerId: 'openai',
        model: 'gpt-5.5',
        messages: [{ role: 'user', content: 'hi' }],
        profile: { kind: 'api_key', credential: 'sk-o' },
        thinking: 'high',
      }),
    )
    expect(body.reasoning).toEqual({ effort: 'high', summary: 'auto' })
  })
})

afterEach(() => vi.unstubAllGlobals())

const baseReq = {
  providerId: 'openai' as const,
  model: 'gpt-5.4-mini',
  system: 'Chỉ dẫn dự án',
  messages: [
    { role: 'user' as const, content: 'chào' },
    { role: 'assistant' as const, content: 'chào bạn' },
    { role: 'user' as const, content: 'tiếp đi' },
  ],
  profile: { kind: 'api_key' as const, credential: 'sk-test' },
}

describe('openai adapter — auth transport', () => {
  it('uses Authorization: Bearer with the api key', () => {
    const h = openaiHeaders(baseReq.profile)
    expect(h.authorization).toBe('Bearer sk-test')
    expect(h['content-type']).toBe('application/json')
  })

  it('POSTs to the Responses endpoint; OPENAI_BASE_URL overrides the origin', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await callOpenAI(baseReq)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses')
    await callOpenAI(baseReq, undefined, { OPENAI_BASE_URL: 'https://gw.example/openai' })
    expect(fetchMock.mock.calls[1][0]).toBe('https://gw.example/openai/v1/responses')
  })
})

describe('openai adapter — Responses request body', () => {
  it('carries instructions + input turns (assistant marked final_answer) + max_output_tokens', () => {
    const body = JSON.parse(openaiBody(baseReq)) as Record<string, unknown>
    expect(body.model).toBe('gpt-5.4-mini')
    expect(body.instructions).toBe('Chỉ dẫn dự án')
    expect(body.input).toEqual([
      { role: 'user', content: 'chào' },
      { role: 'assistant', content: 'chào bạn', phase: 'final_answer' },
      { role: 'user', content: 'tiếp đi' },
    ])
    expect(body.stream).toBe(true)
    expect(body.max_output_tokens).toBe(8192)
    // legacy Chat Completions params must never leak into Responses
    expect(body.messages).toBeUndefined()
    expect(body.max_completion_tokens).toBeUndefined()
    expect(body.stream_options).toBeUndefined()
    expect(body.temperature).toBeUndefined()
  })

  it('omits instructions when absent and honors maxTokens', () => {
    const body = JSON.parse(openaiBody({ ...baseReq, system: '  ', maxTokens: 32 })) as Record<
      string,
      unknown
    >
    expect(body.instructions).toBeUndefined()
    expect(body.max_output_tokens).toBe(32)
  })

  it('D1 — either search or fetch declares the hosted web_search tool + sources include', () => {
    const on = JSON.parse(openaiBody({ ...baseReq, fetch: true })) as Record<string, unknown>
    expect(on.tools).toEqual([{ type: 'web_search' }])
    expect(on.include).toEqual(['web_search_call.action.sources'])
    const off = JSON.parse(openaiBody(baseReq)) as Record<string, unknown>
    expect(off.tools).toBeUndefined()
    expect(off.include).toBeUndefined()
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

describe('openai adapter — Responses SSE transform to the Nova contract', () => {
  it('maps text deltas, reasoning summaries and completed usage', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.created","response":{"id":"resp_1"}}',
          'data: {"type":"response.reasoning_summary_text.delta","delta":"Cân nhắc hai hướng…"}',
          'data: {"type":"response.output_text.delta","delta":"Xin "}',
          'data: {"type":"response.output_text.delta","delta":"chào"}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":11,"output_tokens":6}}}',
          'data: [DONE]',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'thinking_delta',
      'block_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events[1].text).toBe('Cân nhắc hai hướng…')
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 11, outputTokens: 6 })
  })

  it('maps web_search_call items to tool events with action sources', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.created","response":{}}',
          'data: {"type":"response.output_item.added","item":{"type":"web_search_call","id":"ws_1"}}',
          'data: {"type":"response.output_item.done","item":{"type":"web_search_call","id":"ws_1","status":"completed","action":{"type":"search","query":"giá vàng hôm nay","sources":[{"url":"https://a.vn","title":"A"},{"url":"https://b.vn"}]}}}',
          'data: {"type":"response.output_text.delta","delta":"Theo [1]…"}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":4,"output_tokens":9}}}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'tool_start',
      'tool_delta',
      'tool_result',
      'block_delta',
      'message_stop',
    ])
    expect(events[1]).toMatchObject({ id: 'ws_1', name: 'web_search' })
    expect(events[2]).toMatchObject({ id: 'ws_1', text: 'giá vàng hôm nay' })
    expect(events[3]).toMatchObject({
      ok: true,
      sources: [
        { n: 1, url: 'https://a.vn', title: 'A' },
        { n: 2, url: 'https://b.vn', title: 'https://b.vn' },
      ],
    })
  })

  it('falls back to url_citation annotations when the call carries no sources', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.created","response":{}}',
          'data: {"type":"response.output_item.added","item":{"type":"web_search_call","id":"ws_1"}}',
          'data: {"type":"response.output_item.done","item":{"type":"web_search_call","id":"ws_1","status":"completed","action":{"type":"search","query":"tin"}}}',
          'data: {"type":"response.output_text.annotation.added","annotation":{"type":"url_citation","url":"https://c.vn","title":"C"}}',
          'data: {"type":"response.output_text.annotation.added","annotation":{"type":"url_citation","url":"https://c.vn","title":"C lặp"}}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":2,"output_tokens":3}}}',
        ]),
      ),
    )
    const results = events.filter((e) => e.type === 'tool_result')
    // one from the call (no sources) + one synthetic carrying deduped citations
    expect(results).toHaveLength(2)
    expect(results[1]).toMatchObject({
      id: 'cite-1',
      sources: [{ n: 1, url: 'https://c.vn', title: 'C' }],
    })
  })

  it('emits a citation event anchored at the annotation\'s own start/end index', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.created","response":{}}',
          'data: {"type":"response.output_item.added","item":{"type":"web_search_call","id":"ws_1"}}',
          'data: {"type":"response.output_item.done","item":{"type":"web_search_call","id":"ws_1","status":"completed","action":{"type":"search","query":"tin","sources":[{"url":"https://a.vn","title":"A"}]}}}',
          'data: {"type":"response.output_text.delta","delta":"Theo A, giá tăng."}',
          'data: {"type":"response.output_text.annotation.added","annotation":{"type":"url_citation","url":"https://a.vn","title":"A","start_index":5,"end_index":9}}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":2,"output_tokens":3}}}',
        ]),
      ),
    )
    const citation = events.find((e) => e.type === 'citation')
    expect(citation).toMatchObject({ citeStart: 5, citeEnd: 9, citeSource: 1 })
  })

  it('an annotation with no start/end index never emits a citation event (sources-only fallback stays intact)', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.output_text.annotation.added","annotation":{"type":"url_citation","url":"https://d.vn","title":"D"}}',
          'data: {"type":"response.completed","response":{"usage":{}}}',
        ]),
      ),
    )
    expect(events.find((e) => e.type === 'citation')).toBeUndefined()
  })

  it('T5 — captures function_call items + responseId; continuation via previous_response_id', async () => {
    const { openaiToolTail } = await import('./openai')
    const round = { calls: [] as { id: string; name: string; args: string }[] } as import('./shared').RoundCapture
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.created","response":{"id":"resp_9"}}',
          'data: {"type":"response.output_item.added","item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"files"}}',
          'data: {"type":"response.function_call_arguments.delta","item_id":"fc_1","delta":"{\\"op\\":"}',
          'data: {"type":"response.output_item.done","item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"files","arguments":"{\\"op\\":\\"list\\"}"}}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":5,"output_tokens":2}}}',
        ]),
        round,
      ),
    )
    expect(round.responseId).toBe('resp_9')
    expect(round.calls).toEqual([{ id: 'call_1', name: 'files', args: '{"op":"list"}' }])
    // deltas correlate by call_id, not the internal item id
    expect(events.find((e) => e.type === 'tool_delta')).toMatchObject({ id: 'call_1' })

    const tail = openaiToolTail(round, [{ ok: true, content: '2 files' }])
    expect(tail).toEqual([{ type: 'function_call_output', call_id: 'call_1', output: '2 files' }])

    const body = JSON.parse(
      openaiBody({ ...baseReq, previousResponseId: 'resp_9', rawTail: tail }),
    ) as Record<string, unknown>
    expect(body.previous_response_id).toBe('resp_9')
    expect(body.input).toEqual(tail)
    expect(body.instructions).toBe('Chỉ dẫn dự án')
  })

  it('surfaces response.failed and terminal error events, suppressing the stop', async () => {
    const failed = await collect(
      toNovaStream(
        sse([
          'data: {"type":"response.created","response":{}}',
          'data: {"type":"response.failed","response":{"error":{"code":"insufficient_quota","message":"quota"}}}',
        ]),
      ),
    )
    expect(failed.at(-1)).toMatchObject({ type: 'error', code: 'insufficient_quota' })

    const errored = await collect(
      toNovaStream(sse(['data: {"type":"error","code":"server_error","message":"boom"}'])),
    )
    expect(errored.filter((e) => e.type === 'error')).toHaveLength(1)
    expect(errored.some((e) => e.type === 'message_stop')).toBe(false)
  })

  it('ignores malformed lines and still closes the contract', async () => {
    const events = await collect(toNovaStream(sse(['data: {broken', ': ping'])))
    expect(events.map((e) => e.type)).toEqual(['message_stop'])
  })
})
