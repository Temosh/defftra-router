# Project Brief

## Product Summary

Defftra Router is an open-source, lightweight local HTTP reverse proxy/router for developers. It gives an application one or more stable `.localhost` entry points, routes different request paths to independently selected local or remote environments, and applies reusable ordered request-header profiles through a Web UI.

The defining workflow is mixing local and remote application parts without rebuilding, restarting, editing hosts files, or repeatedly changing application configuration. A developer can serve a frontend from a selected remote environment while sending relative `/api` traffic to a local backend, or run the frontend locally while sending its relative API traffic to a selected remote environment.

The product is deliberately domain-neutral. Environment names other than the reserved `LOCAL` environment are user-defined. Header names, values, and profile labels have no built-in authentication, identity, tenant, realm, company, or other application-specific meaning.

## Users

The primary user is a developer working with a frontend and one or more services that may run locally or in remote development environments.

V1 has one local operator role. It has no accounts, remote users, or authorization roles.

## V1 Goals

- Define applications with shared path-routing rules and stable `.localhost` hostname variants.
- Define an ordered list of target environments. `LOCAL` always exists; users create and name every other environment.
- Configure an upstream target URL per supported environment on each path rule.
- Select the active target environment independently for each path rule and apply the change immediately.
- Route a default path and case-sensitive exact or path-prefix matches with deterministic precedence.
- Reuse ordered request-header profiles across hostname variants without duplicating routing rules.
- Let each path rule decide whether variant profiles apply and add its own ordered transformations.
- Support HTTP local traffic and HTTP or HTTPS upstream targets.
- Preserve HTTP, streaming, Server-Sent Events, and WebSocket behavior.
- Persist configuration locally and safely in human-readable, versioned JSON.
- Remain idle at effectively 0% CPU and approximately 30–60 MB RAM, preferably below 50 MB.
- Work on Windows 11 without administrator rights, with macOS support.

## Non-goals For V1

- HTTPS local listeners or locally trusted certificate management.
- Production reverse-proxy or security-boundary use.
- LAN or Internet exposure by default.
- Remote administration, user accounts, or multi-user access control.
- Intercepting traffic that clients did not explicitly send to Defftra.
- Redirecting server-to-server calls made by a remote upstream.
- Response-body or request-body rewriting.
- General response-header, cookie, or redirect rewriting.
- Traffic capture, retained request history, analytics, or telemetry.
- Periodic upstream health polling.
- Query, regular-expression, or request-body matching.
- A database, Docker runtime, Electron shell, system tray, or browser extension.
- YAML configuration, layered team configuration, or operating-system secret storage.
- Domain-specific authentication, identity, tenant, realm, company, or header behavior.

## Core Workflows

### Start the router

1. Run the `defftra-router` CLI.
2. Load and validate persisted configuration.
3. Attempt to bind the configured loopback address and port, defaulting to port 80.
4. If port 80 cannot be bound in an interactive terminal, offer to retry on port 8088.
5. Print the actual management URL; do not open a browser automatically.

### Mix a remote frontend with a local API

1. Configure an application whose default rule can target user-defined remote environments.
2. Configure an `/api` prefix rule with a `LOCAL` target.
3. Select a remote environment for the default rule and `LOCAL` for `/api`.
4. Open any enabled hostname variant for the application.
5. Requests for relative `/api` URLs go to the local target while other requests go to the selected remote frontend.

### Mix a local frontend with a remote API

1. Select `LOCAL` for the application's default rule.
2. Select a user-defined remote environment for `/api`.
3. Refresh the same stable local URL; no process restart or frontend rebuild is required.

### Open a configured profile variant

1. Open the dashboard at `router.localhost` using the active port.
2. Find the user-defined application.
3. Choose one of its enabled hostname variants.
4. The application uses its shared routing table while the variant supplies its ordered profile selection.

### Manage routing

1. Add or edit environments, applications, hostname variants, path rules, target mappings, and profiles.
2. Validate errors inline.
3. Submit the complete candidate through the management API.
4. Persist the new configuration safely.
5. Atomically replace the active in-memory routing snapshot.

### Proxy a request

1. Match the case-insensitive HTTP `Host` against an enabled hostname variant.
2. Match the request pathname against enabled rules: exact match, longest path-prefix match, then default.
3. Resolve the rule's selected environment to its configured target.
4. Apply variant profiles when enabled for that rule, then apply the rule's transformations.
5. Stream the request to the HTTP or HTTPS upstream.
6. Stream the upstream status, headers, and body back to the client.

## Required V1 Behaviors

- `LOCAL` is always present, has a stable reserved identifier, and cannot be renamed or deleted.
- All non-local environment definitions are created, named, ordered, renamed, and deleted by the user.
- A rule exposes only environments for which it has a target URL; an unavailable environment cannot be selected.
- Target selection is persisted, survives restart, and changes without restarting the process.
- Different rules in one application may simultaneously select different environments.
- Multiple hostname variants share one application routing table.
- A disabled hostname variant does not proxy. A disabled path rule falls through to the next eligible match.
- Path matching is case-sensitive, ignores the query string, and treats prefixes as path-segment boundaries.
- The default rule is required and is used when no enabled exact or prefix rule matches.
- Path and query string are preserved. A target base path prefixes the complete incoming path; V1 does not implicitly strip the matched prefix.
- Profile and rule transformations support ordered, case-insensitive `SET`, `APPEND`, and `REMOVE` operations.
- Later transformations observe and may replace the result of earlier transformations.
- The selected upstream owns the `Host` header.
- Request and response bodies, status, headers, redirects, SSE, and compression pass through without whole-body buffering.
- Connection reuse is used where appropriate for both HTTP and HTTPS targets.
- Timeouts, TLS failures, DNS failures, and upstream failures produce useful, non-sensitive errors.
- WebSocket upgrades are proxied to HTTP or HTTPS targets as `ws` or `wss` connections.
- Unknown `.localhost` hosts receive a lightweight page linking to management rather than a raw Node.js error.

## Compatibility Boundary

Defftra controls only traffic addressed to its local listener. The mixed-frontend workflow therefore requires the frontend calls that should be rerouted to use relative URLs on the Defftra origin. Absolute API or WebSocket URLs bypass Defftra. Calls made from a remote upstream to another service also do not pass through the developer's local router.

OAuth and remote application login flows may additionally depend on registered redirect URIs, cookie attributes, Content Security Policy, or absolute URLs. V1 routes and preserves these responses but does not promise to rewrite or bypass upstream security policy.

## Terminology

| Term                | Meaning                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Application         | User-defined local application containing hostname variants and shared path rules                     |
| Hostname variant    | A stable `.localhost` entry point that selects ordered profiles for an application                    |
| Target environment  | A named target choice available to path rules; all but `LOCAL` are user-defined                       |
| `LOCAL` environment | Reserved target environment that always exists; each rule configures its own local URL when supported |
| Path rule           | An exact, prefix, or default pathname match with target mappings and one selected environment         |
| Target mapping      | An environment-to-upstream URL mapping owned by one path rule                                         |
| Header profile      | A reusable ordered list of domain-neutral request-header transformations                              |
| Transformation      | One ordered `SET`, `APPEND`, or `REMOVE` operation on a request header                                |
| Active snapshot     | Immutable validated configuration used for hostname, path, target, and transformation resolution      |

## Security And Privacy Constraints

- Bind to loopback only by default.
- Validate all API and persisted configuration input.
- Accept only HTTP and HTTPS target protocols; reject embedded credentials and fragments.
- Never execute shell commands from user input or expose arbitrary filesystem paths.
- Never log request bodies or header values by default.
- Never retain request history, send configuration externally, or collect telemetry.
- Render user-controlled UI content safely.
- Keep TLS certificate validation enabled. V1 does not provide an ignore-certificate-errors switch.

## Test Baseline

Automated tests must cover hostname-variant selection, shared application rules, configurable environments, the required `LOCAL` environment, independent per-rule target selection, exact/prefix/default precedence, disabled-rule fallback, profile composition, every transformation, path/query/body streaming, HTTP and HTTPS upstreams, SSE, upstream status and headers, response streaming, unknown hosts, validation, persistence/reload, live updates, failure classification, timeouts, and WebSocket proxying.

Tests use ephemeral loopback servers and require no Internet access. HTTPS tests use local test certificates.

## Implementation Baseline

- The project is prerelease. Schema version 1 will be redefined around this model; no compatibility migration from the current scaffold is required.
- The management API uses whole-document `GET` and `PUT` operations under `/api/config` for V1.
- Target selection is persisted configuration, not a separate temporary override system.
- Applications are configured entities rather than projections derived from equal target URLs.
- Profile labels and environment names are presentation data; routing remains domain-neutral.
- Vite remains development/build tooling. The production server remains one Node.js process.

Release work remains for registry/platform packaging, supported browser and macOS version declarations, and resource measurements on Windows and macOS.
