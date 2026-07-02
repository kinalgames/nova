// Better Auth on Cloudflare Workers + D1 (Drizzle adapter).
// Workers pitfalls honoured: a PER-REQUEST instance (no module-level state),
// bearer tokens enabled from day one so native clients never force a rework.

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'

export interface AuthEnv {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  /** canonical URL of this API (defaults to local wrangler dev) */
  BETTER_AUTH_URL?: string
  /** the web client origin allowed to authenticate */
  WEB_ORIGIN?: string
}

export function createAuth(env: AuthEnv) {
  const db = drizzle(env.DB, { schema })
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:8787',
    trustedOrigins: [env.WEB_ORIGIN ?? 'http://localhost:5173'],
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        assistantName: { type: 'string', required: false },
      },
    },
    // web uses session cookies; native (and tests) use the bearer token that
    // login returns in the `set-auth-token` response header
    plugins: [bearer()],
  })
}
