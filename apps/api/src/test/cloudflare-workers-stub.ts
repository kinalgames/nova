// vitest runs on Node where the `cloudflare:workers` module does not exist.
// Route tests only need the class shape; the real DO behaviour is covered by
// the wrangler dev smoke tests.
export class DurableObject {
  constructor(
    public ctx: unknown,
    public env: unknown,
  ) {}
}
