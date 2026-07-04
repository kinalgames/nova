// @nova/ai — provider-agnostic AI transport for Nova.
// Provider registry: the chat proxy dispatches on ChatProxyRequest.providerId.
// Every adapter exposes the same two capabilities: `call` the upstream with
// streaming enabled, and `stream` its wire format into Nova's event contract.

import { providerAuth } from '@nova/shared'
import type { ProviderId } from '@nova/shared'
import { anthropicToolTail, callAnthropic, toNovaStream as anthropicStream } from './anthropic'
import { callGemini, geminiToolTail, toNovaStream as geminiStream } from './gemini'
import { callOpenAI, openaiToolTail, toNovaStream as openaiStream } from './openai'
import { callOllama, ollamaToolTail, toNovaStream as ollamaStream } from './ollama'
import type {
  ProviderEnv,
  ResolvedChatRequest,
  RoundCapture,
  ToolCallResult,
} from './shared'

export { ProviderConfigError, toBase64 } from './shared'
export type {
  NovaStreamEvent,
  NovaTool,
  ProviderEnv,
  ResolvedChatRequest,
  ResolvedPart,
  ResolvedTurn,
  RoundCapture,
  ToolCallReq,
  ToolCallResult,
} from './shared'
export { ollamaEndpoint } from './ollama'
export { agenticStream, LOOP_MAX, type ToolExecutor } from './loop'

export interface ProviderAdapter {
  call(req: ResolvedChatRequest, signal?: AbortSignal, env?: ProviderEnv): Promise<Response>
  stream(upstream: ReadableStream<Uint8Array>, round?: RoundCapture): ReadableStream<Uint8Array>
  /** T5 — provider-native continuation turns for the agentic loop */
  toolTail(round: RoundCapture, results: ToolCallResult[]): unknown[]
}

export const providerAdapters: Record<ProviderId, ProviderAdapter> = {
  claude: { call: callAnthropic, stream: anthropicStream, toolTail: anthropicToolTail },
  gemini: { call: callGemini, stream: geminiStream, toolTail: geminiToolTail },
  openai: { call: callOpenAI, stream: openaiStream, toolTail: openaiToolTail },
  ollama: { call: callOllama, stream: ollamaStream, toolTail: ollamaToolTail },
}

/** credential kinds each provider accepts — the shared auth matrix */
export const providerKinds = providerAuth

export const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === 'string' && value in providerAdapters
