# Defftra Router

Defftra Router is a lightweight, UI-driven local reverse proxy for developers who need to mix local services with remote development environments.

It gives each application stable `.localhost` URLs, routes different paths to independently selected targets, and applies reusable ordered request-header profiles. A typical workflow is to serve a frontend from one environment while sending its relative `/api` requests to a local backend, then reverse that combination with a few clicks.

No browser extension, hosts-file change, Docker container, database, or modification to the proxied application is required.

## Project Status

The project is prerelease. The current code is an initial routing scaffold and is being reshaped around the V1 model documented in [docs/project-brief.md](docs/project-brief.md). No published release or compatibility commitment exists yet, so schema version 1 will adopt the target model directly.

## Target V1

- User-defined applications with shared path rules.
- Stable `.localhost` hostname variants that select reusable header profiles.
- A built-in `LOCAL` target environment that always exists.
- Any number of additional target environments created and named by the user.
- Independent target-environment selection for every path rule.
- Exact, longest-prefix, and default path routing.
- One-click switching between configured local and remote targets.
- Ordered, domain-neutral `SET`, `APPEND`, and `REMOVE` request-header transformations.
- HTTP local listener with HTTP and HTTPS upstream targets.
- Streaming HTTP, Server-Sent Events, WebSocket, and secure WebSocket proxying.
- Immediate validated configuration publication and human-readable versioned JSON persistence.
- Loopback-only binding by default, no traffic history, and no telemetry.

## Example Model

An application can define:

```text
example.localhost
profile-a.example.localhost
```

Both hostnames share the same rules:

```text
/api/**   -> selected API environment
/*        -> selected frontend environment
```

The frontend and API rules select independently. For example, the frontend can use a user-defined remote environment while the API uses `LOCAL`; switching either rule takes effect without restarting Defftra.

Profile headers can be applied to the API rule without also sending them to the frontend target.

## Compatibility Boundary

Defftra reroutes only traffic that clients send to its local hostname. Frontend API and WebSocket calls must therefore use relative URLs to participate in path routing. Absolute URLs bypass Defftra, as do server-to-server calls made by a remote upstream.

OAuth flows may also depend on registered redirect URIs, cookies, Content Security Policy, and absolute URLs. Defftra does not bypass upstream security policy or promise general response rewriting in V1.

## Requirements

- Node.js 26.
- pnpm 10 or newer for development and builds.
- Windows 11 or macOS. Other Node.js platforms may work but are not current support targets.

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Available checks and builds:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

Do not treat a command as verified unless it has been run after the relevant changes.

## Listener

Defftra uses one foreground Node.js process and binds to loopback. The preferred listener port is 80. If port 80 is unavailable in an interactive terminal, the CLI offers port 8088.

The management UI uses `router.localhost`. Every application URL uses the active listener port:

```text
http://router.localhost:8088
http://example.localhost:8088
```

The local listener remains HTTP in V1. Selected upstream targets may use HTTP or HTTPS with normal certificate validation.

## Configuration

Configuration is managed through the local Web UI and stored as schema-versioned JSON in the platform-appropriate per-user application-data directory. Changes are validated and persisted atomically before becoming active.

Target environment definitions are names, not global URLs. `LOCAL` is built in and cannot be deleted. Users define every other environment. Each path rule maps the environments it supports to concrete target URLs and independently selects one of those mappings.

See:

- [Project brief](docs/project-brief.md)
- [Domain model](docs/domain-model.md)
- [Configuration schema](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Management and proxy contracts](docs/api.md)
- [UI requirements](docs/ui.md)
- [Operations](docs/operations.md)

## Security And Privacy

Defftra is a local development tool, not a production security boundary.

- The listener binds to loopback by default.
- HTTPS upstreams use normal certificate and hostname validation.
- Header values may contain secrets and are stored in the local configuration file.
- Request/response bodies and header values are not logged by default.
- Traffic history is not retained.
- Configuration is not transmitted externally.
- No telemetry is collected.

See [SECURITY.md](SECURITY.md) for reporting guidance.
