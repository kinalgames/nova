import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatProxyRequest } from '@nova/shared'
import { streamChat, type StreamHandlers } from './llm'
import { generateTitle, sanitizeTitle } from './title'

const calls: ChatProxyRequest[] = []

vi.mock('./llm', () => ({
  streamChat: vi.fn(async (req: ChatProxyRequest, h: StreamHandlers) => {
    calls.push(req)
    h.onDelta('"Kế hoạch ra mắt Aurora"\n')
    h.onDone({ inputTokens: 10, outputTokens: 6 })
  }),
}))

beforeEach(() => {
  calls.length = 0
  vi.mocked(streamChat).mockClear()
})

describe('sanitizeTitle', () => {
  it('unquotes, takes the first non-empty line and caps at 48 chars', () => {
    expect(sanitizeTitle('"Kế hoạch Aurora"')).toBe('Kế hoạch Aurora')
    expect(sanitizeTitle('\n\n  Dòng thật  \nphần thừa')).toBe('Dòng thật')
    expect(sanitizeTitle('«Tiêu đề»')).toBe('Tiêu đề')
    const long = 'a'.repeat(60)
    expect(sanitizeTitle(long)).toBe(`${'a'.repeat(48)}…`)
  })

  it('empty or whitespace output is null — the caller keeps “Untitled”', () => {
    expect(sanitizeTitle('')).toBeNull()
    expect(sanitizeTitle('  \n  ')).toBeNull()
    expect(sanitizeTitle('""')).toBeNull()
  })
})

describe('generateTitle', () => {
  const base = {
    providerId: 'claude' as const,
    model: 'claude-opus-4-8',
    credential: { profile: { kind: 'api_key' as const, credential: 'sk-x' } },
    userText: 'Lên kế hoạch ra mắt',
    replyText: 'Đây là kế hoạch…',
  }

  it('asks the CHEAPEST whitelisted model with thinking off and a tiny cap', async () => {
    const title = await generateTitle(base)
    expect(title).toBe('Kế hoạch ra mắt Aurora')
    expect(calls[0].model).toBe('claude-haiku-4-5')
    expect(calls[0].thinking).toBe('off')
    expect(calls[0].maxTokens).toBe(64)
    expect(calls[0].system).toContain('title')
    expect(calls[0].profile?.credential).toBe('sk-x')
  })

  it('providers without a cheaper sibling reuse the chat model', async () => {
    await generateTitle({ ...base, providerId: 'ollama', model: 'llama3.2' })
    expect(calls[0].model).toBe('llama3.2')
  })

  it('long transcripts are excerpted before they ride along', async () => {
    await generateTitle({ ...base, userText: 'x'.repeat(2000), replyText: 'y'.repeat(2000) })
    expect(calls[0].messages[0].content.length).toBeLessThan(1200)
  })

  it('a stream error resolves to null instead of throwing', async () => {
    vi.mocked(streamChat).mockImplementationOnce(async (_req, h) => {
      h.onError('upstream_error', 'boom', 500)
    })
    expect(await generateTitle(base)).toBeNull()
  })
})
