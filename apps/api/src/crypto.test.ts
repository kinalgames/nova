import { describe, expect, it } from 'vitest'
import { credentialHint, importCredentialsKey, open, seal } from './crypto'

// deterministic 32-byte test key (NEVER a real secret)
const TEST_KEY_B64 = Buffer.from(new Uint8Array(32).fill(7)).toString('base64')

describe('credential envelope crypto (AES-256-GCM)', () => {
  it('round-trips a credential', async () => {
    const key = await importCredentialsKey(TEST_KEY_B64)
    const sealed = await seal(key, 'sk-ant-super-secret-123')
    expect(sealed.iv).not.toBe('')
    expect(sealed.ct).not.toContain('sk-ant')
    expect(await open(key, sealed)).toBe('sk-ant-super-secret-123')
  })

  it('uses a fresh IV per encryption — same plaintext, different ciphertext', async () => {
    const key = await importCredentialsKey(TEST_KEY_B64)
    const a = await seal(key, 'same-secret')
    const b = await seal(key, 'same-secret')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
  })

  it('rejects tampered ciphertext (GCM auth)', async () => {
    const key = await importCredentialsKey(TEST_KEY_B64)
    const sealed = await seal(key, 'secret')
    const tampered = { ...sealed, ct: sealed.ct.slice(0, -4) + 'AAAA' }
    await expect(open(key, tampered)).rejects.toThrow()
  })

  it('rejects the wrong key', async () => {
    const key = await importCredentialsKey(TEST_KEY_B64)
    const other = await importCredentialsKey(
      Buffer.from(new Uint8Array(32).fill(9)).toString('base64'),
    )
    const sealed = await seal(key, 'secret')
    await expect(open(other, sealed)).rejects.toThrow()
  })

  it('refuses a short key outright', async () => {
    await expect(importCredentialsKey(Buffer.from('short').toString('base64'))).rejects.toThrow(
      /32 bytes/,
    )
  })

  it('hints never leak more than the tail', () => {
    expect(credentialHint('sk-ant-abcdef-9876')).toBe('…9876')
    expect(credentialHint('tiny')).toBe('…')
  })
})
