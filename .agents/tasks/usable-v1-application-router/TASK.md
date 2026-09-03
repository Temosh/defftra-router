# Usable V1 Application Router

## Status

Ready for implementation.

## Objective

Replace the prerelease one-hostname/one-target scaffold with the complete usable V1 application router described in the project documentation.

The finished product must let a developer configure a frontend/default rule and one or more path rules, map each rule to local and user-defined remote environments, switch every rule independently without restarting, and open stable hostname variants that apply reusable ordered request-header profiles.

This is intentionally one large task. The domain model, proxy plan, persistence contract, API, and UI are one coherent feature and should be implemented and verified together rather than split into small handoff tasks.

## Product Decisions

- The project has no released configuration contract. Redefine schema version 1 in place; do not add schema version 2 or migration code for the old scaffold.
- Keep one foreground Node.js process and one loopback HTTP listener.
- Support HTTP and HTTPS upstream targets. Do not add a local HTTPS listener.
- Model applications explicitly. Remove target-derived application grouping and `groupDisplayNames`.
- An application owns shared path rules and one or more stable hostname variants.
- Hostname variants share target selections and differ through ordered profile references.
- Header profiles and environment labels are domain-neutral user data.
- Target environments are global, ordered definitions.
- The reserved definition `{ id: "local", displayName: "LOCAL" }` always exists, appears first, and cannot be renamed or deleted.
- Every other environment is created, named, ordered, renamed, and deleted by the user. Do not hardcode DEV, UAT, STAGE, or other remote names.
- Environment definitions do not own URLs. Every path rule maps the environments it supports to its own concrete target URLs.
- `LOCAL` is globally available but is selectable on a rule only after that rule has a local target URL.
- Each rule independently persists its `selectedEnvironmentId`; changing it publishes immediately and survives restart.
- V1 uses exact, path-segment-aware prefix, and default path matching only.
- Exact wins over prefix, the longest prefix wins, and default is the fallback. Disabled non-default rules fall through.
- Each application has exactly one enabled default rule.
- Incoming path and query are preserved. A target base path/query prefixes the complete incoming path/query. Matching does not strip or rewrite paths.
- A rule explicitly chooses whether hostname-variant profiles apply. Rule transformations run after profile transformations.
- The selected upstream owns `Host`.
- Keep normal TLS certificate and hostname validation. Do not add an insecure bypass.
- The mixed-frontend workflow supports relative client URLs. Do not add body rewriting, browser interception, or claims that absolute URLs can be rerouted.
- Keep the whole-document `GET /api/config` and `PUT /api/config` contract for V1.
- Do not retain request history or header/body values.

## Target Configuration

Implement the schema documented in `docs/configuration.md`:

- `schemaVersion`
- `listener`
- `environments`
- `profiles`
- `applications`
  - `variants`
  - `rules`
    - `match`
    - `targets`
    - `selectedEnvironmentId`
    - `applyVariantProfiles`
    - `transformations`

Replace the current `routes` and `groupDisplayNames` shape completely. The default empty configuration contains the reserved `LOCAL` environment, no profiles, and no applications.

## Implementation Scope

### Domain contracts and validation

- Replace the current route/group types in `src/core` and API DTOs with environment, profile, application, variant, rule, match, and target types.
- Keep immutable readonly contracts.
- Enforce all invariants from `docs/domain-model.md` and bounds from `docs/configuration.md`.
- Normalize hostnames, header names, target URLs, and match paths at validation time.
- Reject unknown properties at every nesting level.
- Give validation issues precise paths suitable for inline UI display.
- Reject deleting referenced environments or profiles through ordinary complete-document validation.
- Ensure identifiers and hostname variants are unique in their documented scopes.
- Prevent selection of an environment without a target mapping.

### Routing snapshot

- Build an immutable lookup from normalized hostname to application and variant.
- Precompile each application's exact and prefix match structures when constructing the snapshot.
- Resolve one immutable proxy plan per request containing application, variant, rule, selected environment, normalized target, and final ordered transformations.
- Match only the URL pathname; ignore the query for rule selection.
- Make prefix matching path-segment aware.
- Skip disabled exact/prefix rules and fall through deterministically.
- Treat impossible states as validation errors rather than runtime defaults.

### Transformation composition

- Reuse the existing `SET`, `APPEND`, and `REMOVE` semantics.
- When `applyVariantProfiles` is true, flatten referenced profiles in variant reference order and preserve transformation order inside every profile.
- Append rule transformations after profiles.
- When it is false, apply only the rule transformations.
- Set the upstream `Host` after configurable transformations.
- Never give semantic meaning to profile names, header names, or values.

### HTTP, HTTPS, WebSocket, SSE, and streaming

- Resolve targets from the proxy plan rather than the old route object.
- Use separate shared HTTP and HTTPS agents with connection reuse and deterministic shutdown.
- Preserve streaming and backpressure; do not buffer complete request or response bodies.
- Preserve method, path, query, status, ordinary response headers, redirects, compression, and SSE.
- Add HTTPS upstream support with default certificate and hostname validation.
- Add WSS upstream support for WebSocket upgrades to HTTPS targets.
- Preserve existing hop-by-hop header handling and improve it only where tests expose protocol issues.
- Keep timeouts and cancellation explicit.
- Return safe, useful classifications for DNS, connection, timeout, and TLS failures without exposing header values or internal stack traces.

### Persistence and management API

- Make the reserved `LOCAL` environment part of the new default configuration.
- Persist the new schema version 1 atomically using the existing store guarantees.
- Keep whole-document read and replacement operations.
- Build the complete snapshot before persistence and publish only after persistence succeeds.
- Ensure target selection uses this same atomic path and is not an unpersisted side channel.
- Retain active listener port reporting and Origin/Host protections.
- Do not implement migration from or acceptance of the obsolete scaffold shape.

### Management UI

- Replace the target-derived dashboard and flat route manager with application-oriented screens.
- Provide environment management with immutable `LOCAL` and arbitrary user-defined environment names.
- Provide reusable profile management with ordered transformations.
- Provide application editing for variants, ordered profile references, path rules, target mappings, selected environments, profile application, and rule transformations.
- Require one default rule per application and explain exact/prefix/default precedence.
- Show an environment as unavailable on a rule until its target URL is configured.
- Make every configured rule's active environment switchable directly from the dashboard.
- Allow frontend/default and API/other rules to be switched independently.
- Show saving state only in the initiating quick-switch control and preserve persistent errors.
- Expose every enabled hostname variant as a one-click launch link using the actual active listener port.
- Preserve keyboard access, programmatic labels, non-drag reordering alternatives, focus behavior, and non-color-only state.
- Render all user-controlled data as text.
- Explain the relative-URL compatibility boundary in relevant configuration help.

### Cleanup

- Remove obsolete route, application-group, and group-display-name code, tests, UI, and terminology.
- Update examples and fixtures to the new schema.
- Preserve the six documented top-level source boundaries and React domain layout.
- Do not add a database, framework, global-state library, form library, polling worker, tray process, or other unrelated dependency.

## Acceptance Criteria

1. A new configuration always contains `LOCAL`, and the API rejects candidates that omit, rename, move from first position, or duplicate it.
2. A user can create arbitrary additional environment names and use them as choices on any rule.
3. An application can have a default rule and an `/api` prefix rule with independent selected environments.
4. Switching the API rule to `LOCAL` leaves the frontend rule's selection unchanged, takes effect on the next request, and survives restart.
5. Switching the frontend rule to `LOCAL` leaves the API selection unchanged.
6. Multiple hostname variants use the same application rules and selections.
7. Two variants can produce different final request headers through different ordered profile references.
8. A rule can disable variant-profile application so sensitive profile headers are not sent to a frontend target.
9. Rule transformations run after profile transformations and can override them.
10. Exact rules beat prefixes, the longest eligible prefix wins, disabled rules fall through, and default handles everything else.
11. Query strings do not affect matching and are preserved upstream.
12. HTTP and HTTPS targets both preserve streamed requests and responses.
13. WS and WSS upgrades use the same routing and transformation plan as HTTP.
14. Target selection and structural edits remain atomic across validation, persistence, and snapshot publication.
15. The dashboard supports the complete mixed local/remote workflow without manual JSON editing or process restart.
16. Unknown, disabled, unavailable, connection, DNS, TLS, and timeout failures remain useful and non-sensitive.
17. The application retains no request history and logs no bodies or header values by default.
18. The production build remains one Node.js server bundle plus static UI and launchers.

## Required Tests

- Unit tests for every validation invariant and normalized representation.
- Unit tests for hostname lookup, exact/prefix/default precedence, segment boundaries, disabled fallback, independent target resolution, and transformation composition.
- Persistence tests for the new default and representative complete configuration.
- Management API tests for full reads/writes, rejection paths, active port, Origin protection, and failed-publication atomicity.
- Integration tests with ephemeral HTTP and HTTPS upstreams for paths, queries, bodies, SSE, compression, failures, timeouts, and connection reuse where observable.
- WebSocket integration tests for WS and WSS.
- React tests for environment, profile, application, variant, rule, target mapping, and dashboard switching behavior.
- Focused Playwright tests for remote-frontend/local-API and local-frontend/remote-API switching using local fixtures that represent both sides without Internet access.

## Verification

Run and make all of these pass after implementation:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

Also perform a manual smoke test from the built `dist` directory with:

- two hostname variants;
- a default frontend rule;
- an `/api` prefix rule;
- `LOCAL` and at least one user-defined environment;
- independent environment switching;
- different profile behavior between the variants;
- one HTTPS upstream and WS and WSS upgrades.

Record any platform-specific resource verification still requiring Windows or macOS manual testing rather than claiming it was completed.

## Out Of Scope

- Compatibility migration for the old prerelease schema.
- Local HTTPS and certificate management.
- Response-header, cookie, redirect, request-body, or response-body rewriting.
- Traffic inspector, request history, metrics, or body capture.
- Periodic health polling.
- Temporary overrides or layered configuration.
- YAML, environment-variable substitution, or secret-store integration.
- Tray application, daemon lifecycle commands, or start-with-OS integration.
- Generated Cartesian combinations of applications, environments, and profiles.
- Query, HTTP-method, glob, regular-expression, or body-based routing.
- Path stripping or arbitrary rewrite rules.
- Custom local DNS or non-`.localhost` domains.

## Completion Notes

When the implementation is complete:

- Update this status to complete and summarize the delivered model and verification.
- Remove prerelease transition wording that is no longer useful from public documentation.
- Keep deferred ideas as explicit non-goals or create later tasks only after a separate product decision.
