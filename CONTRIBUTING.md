# Contributing

Defftra Router requires Node.js 26 and pnpm. Install and verify a checkout with:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

Run the development application on an unprivileged port with `pnpm dev --port 8088`, then open `http://router.localhost:8088`. Tests use temporary directories and ephemeral loopback listeners and require no external services.

Read `AGENTS.md`, `docs/project-brief.md`, and `docs/architecture.md` before changing behavior. Preserve the domain-neutral header model, loopback-only default, streaming proxy behavior, atomic JSON persistence, and the six top-level source boundaries. Update the relevant documentation and tests with behavior changes.

Do not commit secrets or real header credentials. Use synthetic names and values in fixtures and examples.
