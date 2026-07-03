// D1 (SQLite) schema — Better Auth core tables + Nova's profile fields.
// D1 stays THIN by design (auth/user lookup only); message content lives in
// the per-user Durable Object (see docs/backend-architecture.md).

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  // Nova profile (Track D): what the assistant is called for this user
  assistantName: text('assistant_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

/** BE3 — BYOK stored server-side, AES-GCM sealed (see src/crypto.ts).
 *  The plaintext credential exists only in memory while proxying a call. */
export const providerCredential = sqliteTable('provider_credential', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  credentialIv: text('credential_iv').notNull(),
  credentialCt: text('credential_ct').notNull(),
  /** display-safe tail (…abcd) — the UI never sees the secret again */
  hint: text('hint').notNull(),
  status: text('status').notNull().default('untested'),
  priority: integer('priority').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

/** B1 — uploaded attachment metadata; the bytes live in R2 under `r2_key`.
 *  The D1 row is the ownership check for serving/vision and the anchor for
 *  future quota, GC and share features. */
export const attachment = sqliteTable('attachment', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  /** preview family the UI renders: image | pdf | code | csv | md */
  kind: text('kind').notNull(),
  size: integer('size').notNull(),
  r2Key: text('r2_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

/** BE4 — a PUBLIC unlisted snapshot of a conversation. The id is the
 *  secret (random, unguessable); `snapshot` is the frozen transcript JSON;
 *  `fileIds` whitelists which attachments the public file route may serve. */
export const share = sqliteTable('share', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  convId: text('conv_id').notNull(),
  title: text('title').notNull(),
  snapshot: text('snapshot').notNull(),
  fileIds: text('file_ids').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})
