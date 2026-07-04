import { afterEach, describe, expect, it, vi } from 'vitest'
import { listOllamaModels, pullOllamaModel } from './ollama-catalog'

afterEach(() => vi.unstubAllGlobals())

const tags = {
  models: [
    { name: 'ornith:35b', size: 21_166_759_599, details: { parameter_size: '34.7B' } },
    { name: 'llama3.2', size: 2_019_393_189, details: { parameter_size: '3.2B' } },
  ],
}
const showByModel: Record<string, unknown> = {
  'ornith:35b': {
    capabilities: ['completion', 'thinking', 'tools'],
    model_info: { 'qwen35moe.context_length': 262_144 },
  },
  'llama3.2': {
    capabilities: ['completion', 'vision'],
    model_info: { 'llama.context_length': 131_072 },
  },
}

describe('ollama catalog — list', () => {
  it('maps tags + show into ModelDef rows with REAL caps, ctx and size', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith('/api/tags')) return Response.json(tags)
        const body = JSON.parse(String(init?.body)) as { model: string }
        return Response.json(showByModel[body.model])
      }),
    )
    const rows = await listOllamaModels('http://localhost:11434')
    expect(rows).toHaveLength(2)
    expect(rows![0]).toMatchObject({
      id: 'ornith:35b',
      caps: { reasoning: true, toolUse: true },
      ctx: 262_144,
      inPrice: 0,
      size: '19.7 GB',
    })
    expect(rows![0].caps.vision).toBeUndefined()
    expect(rows![1]).toMatchObject({ id: 'llama3.2', caps: { vision: true }, ctx: 131_072 })
    expect(rows![1].caps.reasoning).toBeUndefined()
  })

  it('an unreachable endpoint returns null instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }))
    expect(await listOllamaModels('http://localhost:11434')).toBeNull()
  })

  it('a failed /api/show degrades that model to empty caps, not a crash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('/api/tags')
          ? Response.json({ models: [{ name: 'mystery' }] })
          : new Response('x', { status: 500 }),
      ),
    )
    const rows = await listOllamaModels('http://localhost:11434')
    expect(rows![0]).toMatchObject({ id: 'mystery', caps: {}, ctx: 0, size: '' })
  })

  it('rejects a malformed endpoint via ollamaEndpoint validation', async () => {
    await expect(listOllamaModels('not-a-url')).rejects.toThrow()
  })
})

const ndjson = (lines: unknown[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        const enc = new TextEncoder()
        for (const l of lines) c.enqueue(enc.encode(`${JSON.stringify(l)}\n`))
        c.close()
      },
    }),
    { status: 200 },
  )

async function sseFrames(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text()
  return text
    .split('\n\n')
    .filter((f) => f.startsWith('data: '))
    .map((f) => JSON.parse(f.slice(6)) as Record<string, unknown>)
}

describe('ollama catalog — pull', () => {
  it('re-emits NDJSON progress as SSE and closes with done:true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ndjson([
          { status: 'pulling manifest' },
          { status: 'downloading', total: 100, completed: 40 },
          { status: 'success' },
        ]),
      ),
    )
    const res = await pullOllamaModel('http://localhost:11434', 'llama3.2')
    expect(res.status).toBe(200)
    const frames = await sseFrames(res)
    expect(frames[0]).toEqual({ status: 'pulling manifest' })
    expect(frames[1]).toMatchObject({ total: 100, completed: 40 })
    expect(frames.at(-1)).toEqual({ done: true })
  })

  it('an unreachable endpoint answers one SSE error frame (502)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }))
    const res = await pullOllamaModel('http://localhost:11434', 'x')
    expect(res.status).toBe(502)
    const frames = await sseFrames(res)
    expect(frames[0]).toMatchObject({ error: 'ollama_unreachable', done: true })
  })
})
