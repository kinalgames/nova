import { describe, expect, it, vi } from 'vitest'
import { agenticStream, LOOP_MAX, type AgenticAdapter } from './loop'
import type { NovaStreamEvent, RoundCapture } from './shared'

const enc = new TextEncoder()

/** SSE byte stream from Nova events (what an adapter's stream() yields) */
const sseOf = (events: NovaStreamEvent[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const e of events) c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`))
      c.close()
    },
  })

async function collect(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text()
  return text
    .split('\n\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)) as NovaStreamEvent)
}

const req = {
  providerId: 'claude' as const,
  model: 'claude-sonnet-5',
  messages: [{ role: 'user' as const, content: 'đọc file đi' }],
  profile: { kind: 'api_key' as const, credential: 'sk-x' },
}

/** a scripted adapter: round scripts declare the events + captured calls */
function scripted(
  rounds: { events: NovaStreamEvent[]; calls?: { id: string; name: string; args: string }[] }[],
) {
  let i = 0
  const tails: unknown[][] = []
  const adapter: AgenticAdapter = {
    call: vi.fn(async () => new Response('', { status: 200 })),
    stream: (_body, round?: RoundCapture) => {
      const script = rounds[i++]
      if (round && script.calls) round.calls.push(...script.calls)
      if (round) round.assistantTurn = { round: i }
      return sseOf(script.events)
    },
    toolTail: vi.fn((round: RoundCapture, results: { content: string }[]) => {
      const tail = [round.assistantTurn, { results: results.map((r) => r.content) }]
      tails.push(tail)
      return tail
    }),
  }
  return { adapter, tails }
}

describe('T5 — agentic loop', () => {
  it('runs tool rounds, injects tool_result frames, sums usage into ONE stop', async () => {
    const { adapter, tails } = scripted([
      {
        events: [
          { type: 'message_start' },
          { type: 'tool_start', id: 't1', name: 'files' },
          { type: 'message_stop', usage: { inputTokens: 10, outputTokens: 5 } },
        ],
        calls: [{ id: 't1', name: 'files', args: '{"op":"list"}' }],
      },
      {
        events: [
          { type: 'message_start' },
          { type: 'block_delta', text: 'Bạn có 2 tệp.' },
          { type: 'message_stop', usage: { inputTokens: 30, outputTokens: 8 } },
        ],
      },
    ])
    const execute = vi.fn(async () => ({ ok: true, content: 'f1 · a.md', summary: '2 files' }))
    const events = await collect(agenticStream(adapter, req, execute))

    expect(execute).toHaveBeenCalledWith({ id: 't1', name: 'files', args: '{"op":"list"}' })
    expect(events.map((e) => e.type)).toEqual([
      'message_start',
      'tool_start',
      'tool_result', // injected after execution
      'message_start',
      'block_delta',
      'message_stop', // ONE stop, summed usage
    ])
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 40, outputTokens: 13 })
    expect(events[2]).toMatchObject({ id: 't1', ok: true, summary: '2 files' })
    // continuation carried the captured turn + results
    expect(tails[0][0]).toEqual({ round: 1 })
  })

  it('a round without calls ends the loop after one pass', async () => {
    const { adapter } = scripted([
      {
        events: [
          { type: 'message_start' },
          { type: 'block_delta', text: 'xong' },
          { type: 'message_stop', usage: { inputTokens: 3, outputTokens: 2 } },
        ],
      },
    ])
    const execute = vi.fn()
    const events = await collect(agenticStream(adapter, req, execute))
    expect(execute).not.toHaveBeenCalled()
    expect(events.map((e) => e.type)).toEqual(['message_start', 'block_delta', 'message_stop'])
    expect(events.at(-1)?.usage).toEqual({ inputTokens: 3, outputTokens: 2 })
  })

  it('the LOOP_MAX budget closes the stream honestly', async () => {
    const rounds = Array.from({ length: LOOP_MAX }, (_, n) => ({
      events: [
        { type: 'message_start' } as NovaStreamEvent,
        { type: 'message_stop', usage: { inputTokens: 1, outputTokens: 1 } } as NovaStreamEvent,
      ],
      calls: [{ id: `t${n}`, name: 'files', args: '{}' }],
    }))
    const { adapter } = scripted(rounds)
    const execute = vi.fn(async () => ({ ok: true, content: 'x' }))
    const events = await collect(agenticStream(adapter, req, execute))
    expect(execute).toHaveBeenCalledTimes(LOOP_MAX)
    const stops = events.filter((e) => e.type === 'message_stop')
    expect(stops).toHaveLength(1)
    expect(stops[0].usage).toEqual({ inputTokens: LOOP_MAX, outputTokens: LOOP_MAX })
  })

  it('an executor failure becomes ok:false and the loop continues', async () => {
    const { adapter } = scripted([
      {
        events: [{ type: 'message_start' }, { type: 'message_stop', usage: { inputTokens: 1, outputTokens: 1 } }],
        calls: [{ id: 't1', name: 'files', args: 'not-json' }],
      },
      {
        events: [
          { type: 'block_delta', text: 'không đọc được' },
          { type: 'message_stop', usage: { inputTokens: 2, outputTokens: 2 } },
        ],
      },
    ])
    const execute = vi.fn(async () => {
      throw new Error('boom')
    })
    const events = await collect(agenticStream(adapter, req, execute))
    expect(events.find((e) => e.type === 'tool_result')).toMatchObject({ id: 't1', ok: false })
    expect(events.at(-1)?.type).toBe('message_stop')
  })

  it('a failed FIRST call surfaces an upstream error frame', async () => {
    const adapter: AgenticAdapter = {
      call: async () => new Response('nope', { status: 429 }),
      stream: (b) => b as ReadableStream<Uint8Array>,
      toolTail: () => [],
    }
    const events = await collect(agenticStream(adapter, req, vi.fn()))
    expect(events[0]).toMatchObject({ type: 'error', code: 'upstream_error' })
  })

  it('an in-stream error stops the loop without a trailing stop frame', async () => {
    const { adapter } = scripted([
      {
        events: [{ type: 'message_start' }, { type: 'error', code: 'overloaded', message: 'busy' }],
        calls: [{ id: 't1', name: 'files', args: '{}' }],
      },
    ])
    const events = await collect(agenticStream(adapter, req, vi.fn()))
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'overloaded' })
    expect(events.some((e) => e.type === 'message_stop')).toBe(false)
  })
})
