// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { humanErrorDetail } from './errors'
import i18n from '../i18n'

beforeAll(async () => {
  if (!i18n.isInitialized) await i18n.init()
  await i18n.changeLanguage('vi')
})

describe('humanErrorDetail — provider bodies become one human sentence', () => {
  it('unwraps the Anthropic forbidden body (the region block users hit)', () => {
    const body = '{ "error": { "type": "forbidden", "message": "Request not allowed" } }'
    const out = humanErrorDetail('upstream_error', body, 403)
    expect(out).toContain('403')
    expect(out).toContain('Request not allowed')
    expect(out).not.toContain('{')
  })

  it('classifies region blocks by message even without a status', () => {
    const out = humanErrorDetail('upstream_error', 'Request not allowed')
    expect(out).toContain('vùng máy chủ')
  })

  it('unwraps double-encoded detail strings', () => {
    const body = JSON.stringify({ detail: '{"error":{"message":"unsupported_country_region_territory"}}' })
    expect(humanErrorDetail('upstream_error', body)).toContain('vùng máy chủ')
  })

  it('maps 401 to the key hint', () => {
    const out = humanErrorDetail('upstream_error', '{"error":{"message":"invalid x-api-key"}}', 401)
    expect(out).toContain('Khóa API')
  })

  it('maps 429 and overloaded to their own sentences', () => {
    expect(humanErrorDetail('rate_limited', 'Too many requests')).toContain('giới hạn tốc độ')
    expect(humanErrorDetail('upstream_error', '{"error":{"type":"overloaded_error","message":"Overloaded"}}')).toContain('quá tải')
  })

  it('falls back to code + innermost message for unknown errors', () => {
    const out = humanErrorDetail('stream_closed', '{"error":{"message":"boom"}}', 500)
    expect(out).toBe('stream_closed: boom')
  })

  it('plain-text messages pass through untouched', () => {
    expect(humanErrorDetail('x', 'kaboom', 500)).toBe('x: kaboom')
  })
})

describe('humanErrorDetail — dig edge shapes', () => {
  it('non-object JSON (array) falls back to the raw string', () => {
    expect(humanErrorDetail('x', '[1,2]', 500)).toBe('x: [1,2]')
  })
  it('object with only a detail wrapper unwraps it', () => {
    expect(humanErrorDetail('x', '{"detail":"plain text inside"}', 500)).toBe('x: plain text inside')
  })
  it('empty object falls back to the original message', () => {
    expect(humanErrorDetail('x', '{}', 500)).toBe('x: {}')
  })
})
