// D1/T5 — the bounded agentic loop. One /v1/chat request may span several
// provider rounds: the model calls a Nova tool → the worker executes it →
// the continuation round streams on, all inside the SAME client response.
//
// Division of labour: adapters capture each round (assistant turn, pending
// calls) and build provider-native continuations; this loop owns budgets,
// executes tools, filters the frame stream (intermediate message_stop never
// reaches the client — usage accumulates into the final one) and injects
// synthetic tool_result frames after each execution.

import type {
  NovaStreamEvent,
  ResolvedChatRequest,
  RoundCapture,
  ToolCallReq,
  ToolCallResult,
} from './shared'

/** hard ceiling on tool rounds per request — a runaway loop must never burn
 *  the user's key unbounded */
export const LOOP_MAX = 6

export interface AgenticAdapter {
  call(req: ResolvedChatRequest, signal?: AbortSignal, env?: unknown): Promise<Response>
  stream(upstream: ReadableStream<Uint8Array>, round?: RoundCapture): ReadableStream<Uint8Array>
  /** provider-native continuation for the next round */
  toolTail(round: RoundCapture, results: ToolCallResult[]): unknown[]
}

export type ToolExecutor = (call: ToolCallReq) => Promise<ToolCallResult>

const enc = new TextEncoder()
const dec = new TextDecoder()
const frame = (evt: NovaStreamEvent) => enc.encode(`data: ${JSON.stringify(evt)}\n\n`)

/**
 * Run the agentic loop and return ONE Nova-contract SSE byte stream.
 * Rounds without pending calls (or past the budget) end the loop; the final
 * message_stop carries the summed usage of every round.
 */
export function agenticStream(
  adapter: AgenticAdapter,
  req: ResolvedChatRequest,
  execute: ToolExecutor,
  signal?: AbortSignal,
  env?: unknown,
): ReadableStream<Uint8Array> {
  let usageIn = 0
  let usageOut = 0

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let current: ResolvedChatRequest = req
        for (let i = 1; i <= LOOP_MAX; i++) {
          const upstream = await adapter.call(current, signal, env)
          if (!upstream.ok || !upstream.body) {
            controller.enqueue(
              frame({
                type: 'error',
                code: 'upstream_error',
                message: `Provider returned ${upstream.status}`,
              }),
            )
            break
          }
          const round: RoundCapture = { calls: [] }
          const last = i === LOOP_MAX
          const { done, errored } = await pumpRound(
            adapter.stream(upstream.body, round),
            controller,
            round,
            (inTok, outTok) => {
              usageIn += inTok
              usageOut += outTok
            },
          )
          if (errored || !round.calls.length || signal?.aborted) {
            if (done && !errored)
              controller.enqueue(
                frame({ type: 'message_stop', usage: { inputTokens: usageIn, outputTokens: usageOut } }),
              )
            break
          }
          // execute the round's calls; every result also reaches the client
          // as a tool_result frame for the live trace
          const results: ToolCallResult[] = []
          for (const call of round.calls) {
            const res = await execute(call).catch(
              (): ToolCallResult => ({ ok: false, content: 'tool execution failed' }),
            )
            results.push(res)
            controller.enqueue(
              frame({
                type: 'tool_result',
                id: call.id,
                ok: res.ok,
                ...(res.summary ? { summary: res.summary } : {}),
              }),
            )
          }
          if (last) {
            // budget exhausted — close honestly instead of dangling
            controller.enqueue(
              frame({ type: 'message_stop', usage: { inputTokens: usageIn, outputTokens: usageOut } }),
            )
            break
          }
          current = {
            ...current,
            rawTail: [...(current.rawTail ?? []), ...adapter.toolTail(round, results)],
            ...(round.responseId ? { previousResponseId: round.responseId } : {}),
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError')
          controller.enqueue(
            frame({ type: 'error', code: 'loop_error', message: (e as Error).message }),
          )
      } finally {
        controller.close()
      }
    },
  })
}

/** pipe one round's frames through, holding back its message_stop (the loop
 *  emits the real one) and accumulating its usage */
async function pumpRound(
  stream: ReadableStream<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  _round: RoundCapture,
  addUsage: (inTok: number, outTok: number) => void,
): Promise<{ done: boolean; errored: boolean }> {
  const reader = stream.getReader()
  let buf = ''
  let errored = false
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      if (!chunk.startsWith('data: ')) continue
      let evt: NovaStreamEvent | null = null
      try {
        evt = JSON.parse(chunk.slice(6)) as NovaStreamEvent
      } catch {
        evt = null
      }
      if (evt?.type === 'message_stop') {
        addUsage(evt.usage?.inputTokens ?? 0, evt.usage?.outputTokens ?? 0)
        continue // held back — the loop emits the final stop itself
      }
      if (evt?.type === 'error') errored = true
      controller.enqueue(enc.encode(`${chunk}\n\n`))
    }
  }
  return { done: true, errored }
}
