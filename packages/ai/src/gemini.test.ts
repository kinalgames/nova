import { afterEach, describe, expect, it, vi } from 'vitest'
import { callGemini, geminiRequest, geminiThinkingConfig, toNovaStream } from './gemini'

describe('B1 — binary parts ride as inline_data', () => {
  it('images/PDFs precede the text part; empty content still yields a part', () => {
    const req = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-2.5-pro',
      messages: [
        {
          role: 'user',
          content: 'xem giúp',
          parts: [{ type: 'image', name: 'a.webp', mime: 'image/webp', base64: 'QUJD' }],
        },
      ],
      profile: { kind: 'api_key', credential: 'AIza-x' },
    }) as { contents: { parts: unknown[] }[] }
    expect(req.contents[0].parts).toEqual([
      { inline_data: { mime_type: 'image/webp', data: 'QUJD' } },
      { text: 'xem giúp' },
    ])
  })
})

describe('B5 — thinkingConfig per level and model', () => {
  it("'off' floors at 128 on 2.5 Pro (cannot disable) and 0 on Flash", () => {
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro', thinking: 'off' })).toEqual({
      thinkingBudget: 128,
    })
    expect(geminiThinkingConfig({ model: 'gemini-2.5-flash', thinking: 'off' })).toEqual({
      thinkingBudget: 0,
    })
  })

  it("low/high map to fixed budgets; 'normal'/absent stay on dynamic default", () => {
    expect(geminiThinkingConfig({ model: 'gemini-2.5-flash', thinking: 'low' })).toEqual({
      thinkingBudget: 2048,
    })
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro', thinking: 'high' })).toEqual({
      thinkingBudget: 24576,
    })
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro', thinking: 'normal' })).toBeNull()
    expect(geminiThinkingConfig({ model: 'gemini-2.5-pro' })).toBeNull()
  })

  it('a Gemini 3.x id sends no budget (that generation takes thinkingLevel)', () => {
    expect(geminiThinkingConfig({ model: 'gemini-3-pro', thinking: 'high' })).toBeNull()
  })

  it('the budget rides inside generationConfig, with includeThoughts when thinking is on', () => {
    const req = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
      profile: { kind: 'api_key', credential: 'AIza-x' },
      thinking: 'high',
    }) as { generationConfig: { thinkingConfig?: Record<string, unknown> } }
    expect(req.generationConfig.thinkingConfig).toEqual({
      thinkingBudget: 24576,
      includeThoughts: true,
    })
  })

  it('gen-3 with thinking on sends includeThoughts ONLY — never a budget', () => {
    const req = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-3.1-pro',
      messages: [{ role: 'user', content: 'hi' }],
      profile: { kind: 'api_key', credential: 'AIza-x' },
      thinking: 'normal',
    }) as { generationConfig: { thinkingConfig?: Record<string, unknown> } }
    expect(req.generationConfig.thinkingConfig).toEqual({ includeThoughts: true })
  })

  it("'off' keeps the budget floor but never asks for thoughts", () => {
    const req = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'hi' }],
      profile: { kind: 'api_key', credential: 'AIza-x' },
      thinking: 'off',
    }) as { generationConfig: { thinkingConfig?: Record<string, unknown> } }
    expect(req.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 })
  })
})
import { ProviderConfigError } from './shared'

afterEach(() => vi.unstubAllGlobals())

const baseReq = {
  providerId: 'gemini' as const,
  model: 'gemini-2.5-flash',
  system: 'Chỉ dẫn dự án',
  messages: [
    { role: 'user' as const, content: 'chào' },
    { role: 'assistant' as const, content: 'chào bạn' },
    { role: 'user' as const, content: 'tiếp đi' },
  ],
  profile: { kind: 'api_key' as const, credential: 'AIza-test' },
}

describe('gemini adapter — request shape', () => {
  it('maps roles to user/model and carries systemInstruction + maxOutputTokens', () => {
    const body = geminiRequest(baseReq)
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'chào' }] },
      { role: 'model', parts: [{ text: 'chào bạn' }] },
      { role: 'user', parts: [{ text: 'tiếp đi' }] },
    ])
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'Chỉ dẫn dự án' }] })
    expect(body.generationConfig).toEqual({ maxOutputTokens: 8192 })
  })

  it('omits systemInstruction without a system prompt and honors maxTokens', () => {
    const body = geminiRequest({ ...baseReq, system: undefined, maxTokens: 64 })
    expect(body.systemInstruction).toBeUndefined()
    expect(body.generationConfig).toEqual({ maxOutputTokens: 64 })
  })
})

describe('gemini adapter — api_key transport (official)', () => {
  it('POSTs to generativelanguage with x-goog-api-key and SSE streaming', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await callGemini(baseReq)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse',
    )
    const headers = init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('AIza-test')
    expect(headers.authorization).toBeUndefined()
  })
})

describe('gemini adapter — non-api_key profile is a config error', () => {
  it('rejects an account-kind profile instead of falling back to any other transport', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      callGemini({ ...baseReq, profile: { kind: 'account', credential: 'ya29.token' } }),
    ).rejects.toThrow(ProviderConfigError)
    expect(fetchMock).not.toHaveBeenCalled()
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

describe('gemini adapter — SSE transform to the Nova contract', () => {
  it('maps plain (api_key) chunks: start, deltas, usage on stop', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"Xin "}],"role":"model"}}],"usageMetadata":{"promptTokenCount":9}}',
          'data: {"candidates":[{"content":{"parts":[{"text":"chào"}],"role":"model"},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":9,"candidatesTokenCount":5,"totalTokenCount":14}}',
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
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 9, outputTokens: 5 })
  })

  it('counts thought tokens as output alongside candidate tokens', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":2,"thoughtsTokenCount":4}}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual(['message_start', 'block_delta', 'message_stop'])
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 3, outputTokens: 6 })
  })

  it('surfaces upstream error payloads and suppresses the stop event', async () => {
    const events = await collect(
      toNovaStream(
        sse(['data: {"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED"}}']),
      ),
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'error',
      code: 'RESOURCE_EXHAUSTED',
      message: 'quota',
    })
  })

  it('ignores malformed lines and still closes the contract', async () => {
    const events = await collect(toNovaStream(sse(['data: {broken', ': keepalive', ''])))
    expect(events.map((e) => e.type)).toEqual(['message_stop'])
  })

  it('D1 — search/fetch flags declare built-in tools on the request', () => {
    const on = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-3.1-pro',
      messages: [{ role: 'user', content: 'hi' }],
      profile: { kind: 'api_key', credential: 'AIza-x' },
      search: true,
      fetch: true,
    })
    expect(on.tools).toEqual([{ google_search: {} }, { url_context: {} }])
    expect(geminiRequest(baseReq).tools).toBeUndefined()
  })

  it('D1 — groundingMetadata surfaces ONCE as a finished web_search tool call', async () => {
    const meta =
      '"groundingMetadata":{"webSearchQueries":["giá vàng hôm nay"],"groundingChunks":[{"web":{"uri":"https://a.vn","title":"A"}},{"web":{"uri":"https://b.vn","title":"B"}}]}'
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"Theo nguồn…"}]},' + meta + '}]}',
          'data: {"candidates":[{"content":{"parts":[{"text":" cập nhật."}]},' + meta + '}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":9}}',
        ]),
      ),
    )
    expect(events.filter((e) => e.type === 'tool_start')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'tool_result')).toHaveLength(1)
    expect(events.find((e) => e.type === 'tool_delta')).toMatchObject({ text: 'giá vàng hôm nay' })
    expect(events.find((e) => e.type === 'tool_result')).toMatchObject({
      id: 'gs-1',
      ok: true,
      sources: [
        { n: 1, url: 'https://a.vn', title: 'A' },
        { n: 2, url: 'https://b.vn', title: 'B' },
      ],
    })
  })

  it('D1/citations — groundingSupports emit citation events anchored at their own segment offsets', async () => {
    const meta =
      '"groundingMetadata":{"groundingChunks":[{"web":{"uri":"https://a.vn","title":"A"}},{"web":{"uri":"https://b.vn","title":"B"}}],"groundingSupports":[{"segment":{"startIndex":0,"endIndex":4,"text":"giá tăng"},"groundingChunkIndices":[1]}]}'
    const events = await collect(
      toNovaStream(sse(['data: {"candidates":[{"content":{"parts":[{"text":"giá tăng"}]},' + meta + '}]}'])),
    )
    const citation = events.find((e) => e.type === 'citation')
    // groundingChunkIndices:[1] -> the SECOND grounding chunk -> source n=2
    expect(citation).toMatchObject({ citeStart: 0, citeEnd: 4, citeSource: 2 })
  })

  it('D1/citations — a grounding chunk missing a uri does not shift the numbering groundingSupports reference', async () => {
    const meta =
      '"groundingMetadata":{"groundingChunks":[{"web":{}},{"web":{"uri":"https://b.vn","title":"B"}}],"groundingSupports":[{"segment":{"startIndex":0,"endIndex":1,"text":"x"},"groundingChunkIndices":[1]}]}'
    const events = await collect(toNovaStream(sse(['data: {"candidates":[{"content":{"parts":[{"text":"x"}]},' + meta + '}]}'])))
    const citation = events.find((e) => e.type === 'citation')
    // the invalid chunk 0 never got a number, so chunk 1 (the only valid one) is n=1
    expect(citation).toMatchObject({ citeStart: 0, citeEnd: 1, citeSource: 1 })
  })

  it('D1 — urlContextMetadata surfaces as a web_fetch tool call with retrieval status', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"Nội dung trang…"}]},"urlContextMetadata":{"urlMetadata":[{"retrievedUrl":"https://doc.vn/bai","urlRetrievalStatus":"URL_RETRIEVAL_STATUS_SUCCESS"}]}}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":4}}',
        ]),
      ),
    )
    expect(events.find((e) => e.type === 'tool_start')).toMatchObject({ id: 'uc-1', name: 'web_fetch' })
    expect(events.find((e) => e.type === 'tool_result')).toMatchObject({
      ok: true,
      sources: [{ n: 1, url: 'https://doc.vn/bai', title: 'https://doc.vn/bai' }],
    })
  })

  it('T5 — captures functionCall parts (thoughtSignature kept) + continuation tail', async () => {
    const { geminiToolTail } = await import('./gemini')
    const round = { calls: [] as { id: string; name: string; args: string }[] } as import('./shared').RoundCapture
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"files","args":{"op":"list"}},"thoughtSignature":"dHM="}]}}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":2}}',
        ]),
        round,
      ),
    )
    expect(round.calls).toEqual([{ id: 'gm-1', name: 'files', args: '{"op":"list"}' }])
    expect(events.find((e) => e.type === 'tool_start')).toMatchObject({ id: 'gm-1', name: 'files' })
    const turn = round.assistantTurn as { role: string; parts: Record<string, unknown>[] }
    expect(turn.role).toBe('model')
    expect(turn.parts[0]).toMatchObject({
      functionCall: { name: 'files', args: { op: 'list' } },
      thoughtSignature: 'dHM=',
    })
    const tail = geminiToolTail(round, [{ ok: true, content: '2 tệp' }])
    expect(tail[1]).toEqual({
      role: 'user',
      parts: [{ functionResponse: { name: 'files', response: { result: '2 tệp' } } }],
    })
  })

  it('T5 — novaTools declare as functionDeclarations alongside built-ins', () => {
    const body = geminiRequest({
      providerId: 'gemini',
      model: 'gemini-3.1-pro',
      messages: [{ role: 'user', content: 'hi' }],
      profile: { kind: 'api_key', credential: 'AIza-x' },
      search: true,
      novaTools: [{ name: 'files', description: 'read files', parameters: { type: 'object' } }],
    }) as { tools: unknown[] }
    expect(body.tools).toEqual([
      { google_search: {} },
      {
        functionDeclarations: [
          { name: 'files', description: 'read files', parameters: { type: 'object' } },
        ],
      },
    ])
  })

  it('streams thought-flagged parts as thinking_delta, plain parts as block_delta', async () => {
    const events = await collect(
      toNovaStream(
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"Cân nhắc các hướng…","thought":true}]}}]}',
          'data: {"candidates":[{"content":{"parts":[{"text":"Đây là câu trả lời"}]}}],"usageMetadata":{"promptTokenCount":4,"candidatesTokenCount":3,"thoughtsTokenCount":8}}',
        ]),
      ),
    )
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'thinking_delta',
      'block_delta',
      'message_stop',
    ])
    expect(events[1].text).toBe('Cân nhắc các hướng…')
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 4, outputTokens: 11 })
  })
})
