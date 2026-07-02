import { describe, expect, it } from 'vitest'
import { pickProfile } from '@nova/shared'
import app from './index'

describe('nova-api skeleton', () => {
  it('healthz reports the service is up', async () => {
    const res = await app.request('/healthz')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; service: string }
    expect(body.ok).toBe(true)
    expect(body.service).toBe('nova-api')
  })

  it('unknown routes 404', async () => {
    const res = await app.request('/nope')
    expect(res.status).toBe(404)
  })

  it('the shared domain engine resolves from the api workspace', () => {
    // the provider-proxy layer (BE3) reuses the client-proven rotation engine
    const picked = pickProfile(
      [
        { id: 'a', name: 'a', kind: 'api_key', credential: 'k', status: 'error' },
        { id: 'b', name: 'b', kind: 'api_key', credential: 'k', status: 'active' },
      ],
      undefined,
      true,
    )
    expect(picked?.id).toBe('b')
  })
})
