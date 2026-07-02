// Envelope encryption for stored provider credentials (BE3).
// AES-256-GCM via WebCrypto — the key comes from the CREDENTIALS_KEY secret
// (base64, 32 bytes; `openssl rand -base64 32`). A fresh random IV per
// encryption; GCM authenticates, so any tampering fails decryption loudly.

const b64encode = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

const b64decode = (s: string): Uint8Array => {
  const raw = atob(s)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** import the base64 secret as a non-extractable AES-GCM key */
export async function importCredentialsKey(secretB64: string): Promise<CryptoKey> {
  const raw = b64decode(secretB64)
  if (raw.length !== 32) throw new Error('CREDENTIALS_KEY must be 32 bytes (base64)')
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export interface Sealed {
  /** base64 12-byte IV */
  iv: string
  /** base64 ciphertext + GCM tag */
  ct: string
}

export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { iv: b64encode(iv), ct: b64encode(ct) }
}

/** throws on wrong key or tampered ciphertext (GCM auth) */
export async function open(key: CryptoKey, sealed: Sealed): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(sealed.iv) },
    key,
    b64decode(sealed.ct),
  )
  return new TextDecoder().decode(pt)
}

/** a display-safe hint — the tail of the credential, never the whole */
export function credentialHint(credential: string): string {
  const tail = credential.slice(-4)
  return credential.length > 8 ? `…${tail}` : '…'
}
