// The bearer session token, shared by every API service. Its own module so
// llm.ts (chat relay) and auth.ts (auth flows) can both read it without an
// import cycle (auth.ts already imports API_BASE from llm.ts).

export const TOKEN_KEY = 'nova.auth.token'

// guarded: llm.ts also runs under non-DOM test environments where
// localStorage does not exist — "no storage" simply means "no session"
export const getToken = (): string | null =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)
