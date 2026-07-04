// @nova/ai — provider-agnostic AI transport for Nova.
// Provider registry: the chat proxy dispatches on ChatProxyRequest.providerId.
// Every adapter exposes the same two capabilities: `call` the upstream with
// streaming enabled, and `stream` its wire format into Nova's event contract.

import { providerAuth } from '@nova/shared'
import type { ProviderId } from '@nova/shared'
import { callAnthropic, toNovaStream as anthropicStream } from './anthropic'
import { callGemini, toNovaStream as geminiStream } from './gemini'
import { callOpenAI, toNovaStream as openaiStream } from './openai'
import { callOllama, toNovaStream as ollamaStream } from './ollama'
import type { ProviderEnv, ResolvedChatRequest } from './shared'

export { ProviderConfigError, toBase64 } from './shared'
export type {
  NovaStreamEvent,
  ProviderEnv,
  ResolvedChatRequest,
  ResolvedPart,
  ResolvedTurn,
} from './shared'
export { ollamaEndpoint } from './ollama'

export interface ProviderAdapter {
  call(req: ResolvedChatRequest, signal?: AbortSignal, env?: ProviderEnv): Promise<Response>
  stream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array>
}

export const providerAdapters: Record<ProviderId, ProviderAdapter> = {
  claude: { call: callAnthropic, stream: anthropicStream },
  gemini: { call: callGemini, stream: geminiStream },
  openai: { call: callOpenAI, stream: openaiStream },
  ollama: { call: callOllama, stream: ollamaStream },
}

/** credential kinds each provider accepts — the shared auth matrix */
export const providerKinds = providerAuth

export const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === 'string' && value in providerAdapters
