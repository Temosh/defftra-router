# Management API And Proxy Contracts

## Status

This document defines contract requirements, not concrete endpoints. Paths, request schemas, response schemas, size limits, and error codes must be specified before implementation and kept synchronized with the UI.

## Management API

The management API is a small JSON-over-HTTP interface served only under the reserved management hostname on the same loopback listener as proxy traffic.

It must support:

- Reading listener settings, routes, and application-group display metadata.
- Creating, editing, duplicating, deleting, enabling, and disabling routes.
- Reordering request-header transformations.
- Updating optional application-group display names.
- Returning enough accepted state for the UI to reflect a successful atomic update.

All mutation input is untrusted. Validate HTTP method, content type, body size, complete schema, ID, hostname, upstream URL, operation, header name, and operation-dependent values. Reject unknown fields unless a documented compatibility strategy requires them.

Mutations succeed only after the new configuration is validated, safely persisted, and published as the active snapshot. Failures must leave the prior file and snapshot intact.

## Error Model

Errors should have a stable machine-readable code, a safe human-readable message, and optional field-level details. They must not expose configured header values, request bodies, arbitrary filesystem paths, stack traces, or raw internal errors.

Expected categories include validation failure, conflict, unsupported media type, payload too large, persistence failure, and internal failure.

## Proxy Contract

For an enabled matching hostname, preserve:

- HTTP method.
- Incoming path and query string.
- Streaming request body.
- Upstream response status and headers.
- Streaming or chunked response body.
- Normal redirects.
- WebSocket upgrade and duplex traffic.

Apply only the configured request-header transformations and changes strictly necessary for correct proxy operation. Host-header forwarding policy and upstream-base-path composition remain explicit design decisions.

Unknown and disabled hostnames receive lightweight Defftra Router responses linking to the actual management URL. Upstream connection failures and timeouts receive useful gateway-style errors without sensitive details.

## Access Controls

Loopback binding is the primary access boundary, but the API must also validate the management Host and intended browser origin to reduce unintended cross-origin and DNS-rebinding-style access. V1 does not define user accounts or remote administration.
