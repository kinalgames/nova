// Better Auth on Cloudflare Workers + D1 (Drizzle adapter).
// Workers pitfalls honoured: a PER-REQUEST instance (no module-level state),
// bearer tokens enabled from day one so native clients never force a rework.

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'
import { mailConfigured, sendMail, type MailEnv } from './mail'
import { verificationEmail } from './email-templates'

export interface AuthEnv extends MailEnv {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  /** canonical URL of this API (defaults to local wrangler dev) */
  BETTER_AUTH_URL?: string
  /** the CANONICAL web origin — email callbacks land here and it is always
   *  trusted for auth POSTs */
  WEB_ORIGIN?: string
  /** extra origins allowed to authenticate (comma-separated) — the legacy
   *  workers.dev host keeps email sign-in while nova.kinal.co is canonical */
  TRUSTED_ORIGINS_EXTRA?: string
  /** social login — a provider activates when BOTH its values are set */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
}

export function createAuth(env: AuthEnv) {
  const db = drizzle(env.DB, { schema })
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:8787',
    trustedOrigins: [
      env.WEB_ORIGIN ?? 'http://localhost:5173',
      ...(env.TRUSTED_ORIGINS_EXTRA?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
    ],
    emailAndPassword: { enabled: true },
    // D5 — send a verification link on signup. NOT required for sign-in: it
    // must never lock out accounts created before this shipped; the web app
    // shows a soft “verify” nudge instead. The callback is guarded so a
    // missing mail config (local dev) leaves signup working, just silent.
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
        if (!mailConfigured(env)) return
        // a mail-provider hiccup (Graph outage/throttle) must NEVER break signup
        // or the resend flow, and must not bubble up as a retryable error that
        // burns another send attempt — swallow and log, the banner offers retry
        try {
          // land the user back on the WEB app after the API verifies the token
          const link = new URL(url)
          link.searchParams.set('callbackURL', env.WEB_ORIGIN ?? 'http://localhost:5173')
          await sendMail(env, verificationEmail(user.email, link.toString()))
        } catch (e) {
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'verification email send failed',
              error: String(e).slice(0, 200),
            }),
          )
        }
      },
    },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
    },
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
