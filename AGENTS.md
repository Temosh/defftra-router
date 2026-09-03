# AGENTS.md

Defftra Router is an open-source, UI-driven local HTTP reverse proxy for developers. It routes `.localhost` hostnames to local development servers and applies arbitrary, ordered request-header transformations. Windows 11 without administrator rights is the primary target; macOS is also supported.

Keep this file as the short entry point for all coding agents. Detailed guidance belongs in `.agents/rules/`, product facts in `docs/`, and durable workstream notes in `.agents/tasks/`.

## Before Working

1. Read `docs/project-brief.md` and `docs/architecture.md`.
2. Read `.agents/rules/stack.md` and the task-relevant rules listed below.
3. Inspect the current source and manifests before assuming commands or implementation details.
4. Preserve user work and prefer small, focused changes.
5. Update documentation when a change affects documented behavior or decisions.

## Product Guardrails

- Keep all route and header behavior domain-neutral. Never hardcode authentication, tenant, realm, company, or specific-header semantics.
- Bind only to loopback by default. Do not expose the proxy or management interface to the LAN by default.
- V1 accepts HTTP local traffic and HTTP upstream targets only.
- Stream proxy traffic; do not buffer whole request or response bodies.
- Do not keep traffic history or log request bodies or header values.
- Persist configuration as human-readable, versioned JSON. Do not introduce a database.
- Route changes must take effect without restarting the process.
- No Electron, Docker requirement, polling loops, telemetry, or unnecessary workers.
- Treat the application as a local development tool, not a production security boundary.

## Stack

- Node.js 26 and TypeScript.
- pnpm, with a committed `pnpm-lock.yaml` once the project is scaffolded.
- React compiled by Vite to static assets served by the Node.js process.
- Prefer Node.js built-in APIs and keep production dependencies minimal.
- Vitest for unit and integration tests, React Testing Library for component behavior, and Playwright for selected end-to-end flows.
- ESLint and Prettier for linting and formatting.

Use latest stable package versions compatible with Node.js 26. Record resolved versions in the manifest and lockfile; do not use this policy as a reason for unrelated upgrades.

## Commands

The repository is currently in its documentation-only initialization phase and has no package manifest or runnable commands. When scaffolding is added, expose and document these pnpm scripts consistently:

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm format
pnpm start
```

Do not claim a command works until it exists and has been verified.

## Architecture

One Node.js process owns the CLI, loopback HTTP listener, host-based route selection, request-header transformations, streaming proxy, WebSocket upgrades, management API, configuration persistence, and production static-file serving. Vite is development/build tooling, not the production server.

The management UI uses the reserved `defftra.localhost` hostname on the active listener port. Dashboard application groups are derived from exact upstream target URLs. A group can have an optional user-defined display name and must expose a one-click action for every configured route in that group.

See `docs/architecture.md` for conceptual boundaries and dependency direction.

## Current Source Layout

There is no application source tree yet. The first implementation pass must create the six top-level boundaries `src/cli/`, `src/core/`, `src/contracts/`, `src/persistence/`, `src/server/`, and `src/ui/`. The React UI is further divided into `app/`, `pages/`, `domains/`, and `shared/`. Follow `.agents/rules/architecture-node-react-full-stack.md`.

## Documentation

| File | Purpose |
|------|---------|
| `README.md` | Public overview and project status |
| `docs/project-brief.md` | Product goals, users, workflows, constraints, terminology |
| `docs/architecture.md` | System shape, boundaries, data flow, and test strategy |
| `docs/domain-model.md` | Configuration entities and invariants |
| `docs/api.md` | Management API and proxy contract baseline |
| `docs/configuration.md` | Persistence and route configuration behavior |
| `docs/ui.md` | Dashboard and route-management UX requirements |
| `docs/operations.md` | CLI, listener, logging, and failure behavior |
| `SECURITY.md` | Security boundary and vulnerability reporting |
| `CONTRIBUTING.md` | Contribution expectations |

## Rule Index

Use only the rules relevant to the task:

| File | Purpose |
|------|---------|
| `.agents/rules/stack.md` | Project-specific runtime, tooling, dependency, persistence, and integration rules |
| `.agents/rules/documentation-and-diagrams.md` | Documentation and Mermaid diagram rules |
| `.agents/rules/code-conventions.md` | Language-agnostic conventions |
| `.agents/rules/code-conventions-typescript.md` | TypeScript conventions |
| `.agents/rules/code-conventions-react.md` | React conventions |
| `.agents/rules/architecture-node-react-full-stack.md` | Full-stack Node.js boundaries and React UI layout |

## Diagrams

Use Mermaid when a diagram improves communication. Do not create ASCII-art, ANSI-art, or Unicode box-drawing diagrams. Follow `.agents/rules/documentation-and-diagrams.md`.

## Task Notes

Use `.agents/tasks/<task-name>/TASK.md` for investigation findings, plans, decisions, and handoff state that must persist across sessions. Keep reusable rules in `.agents/rules/`, project facts in `docs/`, and transient notes in the conversation.
