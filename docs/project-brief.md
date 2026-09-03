# Project Brief

## Product Summary

Defftra Router is an open-source, extremely lightweight local HTTP reverse proxy/router for developers. Users configure `.localhost` routes and arbitrary ordered request-header transformations through a Web UI. It avoids browser extensions, host-file changes, Docker, changes to proxied applications, and administrator privileges for its primary Windows 11 use case.

The product is deliberately domain-neutral. Header names and values have no built-in meaning.

## Users

The primary user is a developer who runs one or more applications locally and needs convenient, repeatable entry points that differ by hostname or request headers.

V1 has one local operator role. It has no accounts, remote users, or authorization roles.

## Goals

- Configure, open, edit, duplicate, enable, disable, and delete routes through a compact Web UI.
- Route requests by hostname through one configurable loopback listener.
- Apply ordered, case-insensitive `SET`, `APPEND`, and `REMOVE` request-header transformations.
- Activate valid configuration changes immediately without restarting.
- Preserve HTTP and WebSocket behavior while streaming traffic.
- Persist configuration locally and safely in human-readable, versioned JSON.
- Remain idle at effectively 0% CPU and approximately 30–60 MB RAM, preferably below 50 MB.
- Work on Windows 11 without administrator rights, with macOS support.

## Non-goals For V1

- Production reverse-proxy or security-boundary use.
- HTTPS listeners or HTTPS upstreams.
- LAN or Internet exposure by default.
- Remote administration, user accounts, or multi-user access control.
- Response rewriting or request-body rewriting.
- Traffic capture, history, analytics, or telemetry.
- A database, Docker runtime, Electron shell, or browser extension.
- Domain-specific authentication, identity, tenant, or company behavior.

## Core Workflows

### Start the router

1. Run the `defftra-router` CLI.
2. Load and validate persisted configuration.
3. Attempt to bind the configured loopback address and port, defaulting to port 80.
4. If port 80 cannot be bound in an interactive terminal, offer to retry on port 8088.
5. Print the actual management URL; do not open a browser automatically.

### Open a configured application flow

1. Open the dashboard at `defftra.localhost` using the active port.
2. Find the application group derived from an exact upstream target URL.
3. Choose one of its route options.
4. Navigate to that route's actual local URL, including the port when it is not 80.

### Manage routes

1. Add or edit a route and its ordered transformations.
2. Validate errors inline.
3. Submit the change through the management API.
4. Persist the new configuration safely.
5. Atomically replace the active in-memory route snapshot.

### Proxy a request

1. Match the case-insensitive HTTP Host against an enabled route.
2. Apply its transformations in configured order.
3. Stream the request to the HTTP upstream.
4. Stream the upstream status, headers, and body back to the client.
5. Return a useful local error when routing or upstream communication fails.

## Required V1 Behaviors

- Multiple hostnames may target the same upstream.
- A disabled route does not proxy.
- Path and query string are preserved.
- GET, POST bodies, streamed bodies, streamed responses, redirects, status codes, and response headers are preserved.
- Connection reuse is used where appropriate.
- Timeouts and upstream failures produce useful, non-sensitive errors.
- WebSocket upgrades are proxied.
- Unknown `.localhost` hosts receive a lightweight page linking to management rather than a raw Node.js error.

## Terminology

| Term | Meaning |
|------|---------|
| Route | A hostname-to-upstream mapping plus enabled state and ordered transformations |
| Local URL | The browser-facing HTTP URL formed from the route hostname and active listener port |
| Upstream target | The exact HTTP URL receiving proxied traffic |
| Application group | Dashboard grouping derived from routes with exactly equal upstream target URLs |
| Group display name | Optional user-defined dashboard label associated with an exact upstream target |
| Transformation | One ordered `SET`, `APPEND`, or `REMOVE` operation on a request header |
| Management host | Reserved `defftra.localhost` hostname serving the UI and API |
| Active snapshot | Immutable validated route configuration currently used for routing |

## Security And Privacy Constraints

- Bind to loopback only by default.
- Validate all API and persisted configuration input.
- Reject non-HTTP target protocols in V1.
- Never execute shell commands from user input or expose arbitrary filesystem paths.
- Never log request bodies or header values by default.
- Never send configuration externally or collect telemetry.
- Render user-controlled UI content safely.

## Test Baseline

Automated tests must cover hostname selection, shared upstreams, enabled state, every transformation, header-name case insensitivity, path/query/body streaming, upstream status and headers, response streaming, unknown hosts, validation, persistence/reload, live updates, upstream failure, timeouts, and WebSocket proxying. Tests use ephemeral loopback servers and require no Internet access.

## Open Implementation Decisions

- Concrete management API paths, payload schemas, and error codes.
- Concrete JSON schema and migration strategy beyond mandatory schema versioning.
- Host header forwarding policy.
- Incoming path composition when an upstream target URL contains a path.
- Exact `APPEND` wire semantics for headers whose values cannot be safely comma-combined.
- Storage representation for optional group display names.
- Whether disabled routes appear on the launch dashboard.
- Non-interactive behavior after a listener bind failure.
- CLI distribution and publishing workflow.
- Minimum supported macOS and browser versions.
