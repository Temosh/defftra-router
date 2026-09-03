# Defftra Router

Defftra Router is an extremely lightweight, UI-driven local HTTP reverse proxy for developers. It maps `.localhost` hostnames to local development applications and applies arbitrary request-header transformations—without browser extensions, Docker, host-file changes, or administrator rights for the primary Windows 11 use case.

> The project is currently in its specification and initialization phase. There is not yet a runnable release.

## Intended experience

A developer will configure routes through a compact Web UI:

```text
app-preauth.localhost
    -> http://127.0.0.1:8080
    -> SET x-example-user = developer1

app-standard.localhost
    -> http://127.0.0.1:8080
    -> no header transformations
```

Header names and values are completely user-defined. Defftra Router has no built-in knowledge of authentication systems, tenants, realms, or company-specific concepts.

Planned V1 capabilities include:

- Hostname-based routing through one loopback HTTP listener.
- A dashboard grouped by exact upstream target, with one-click access to every configured route.
- `SET`, `APPEND`, and `REMOVE` request-header transformations.
- Immediate configuration changes through the management UI/API.
- Streaming HTTP request and response proxying, including WebSocket upgrades.
- Human-readable, versioned JSON persistence with interruption-safe writes.
- Minimal, privacy-conscious logging and no telemetry or traffic history.

## Constraints

- Primary platform: Windows 11 without administrator rights.
- Additional platform: macOS.
- Runtime: Node.js 26 and TypeScript.
- UI: React built with Vite and served as static assets by the Node.js process.
- Package manager: pnpm.
- Target idle footprint: approximately 30–60 MB RAM, preferably below 50 MB, with effectively 0% idle CPU.
- V1 listener and upstream protocol: HTTP only.
- Default listener: loopback port 80. If binding fails, the CLI offers an interactive retry on port 8088.

Defftra Router is a local development tool and is not intended to establish a production security boundary.

## Development status

The repository does not yet contain application source or a package manifest. Commands will be added and verified during the first implementation pass; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- [Project brief](docs/project-brief.md)
- [Architecture](docs/architecture.md)
- [Domain model](docs/domain-model.md)
- [Management API and proxy contracts](docs/api.md)
- [Configuration](docs/configuration.md)
- [UI requirements](docs/ui.md)
- [Operations](docs/operations.md)
- [Security policy](SECURITY.md)

## License

[MIT](LICENSE)
