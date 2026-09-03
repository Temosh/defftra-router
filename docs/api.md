# Management API And Proxy Contracts

## Transport

The JSON API is served only when the normalized `Host` is `router.localhost`, on the same loopback listener as proxy traffic. API responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Mutation requests with an `Origin` header must exactly match the active management origin.

The maximum JSON request body is 1 MiB. Unknown fields are rejected at every configuration level.

## Endpoints

| Method | Path          | Behavior                                                                           |
| ------ | ------------- | ---------------------------------------------------------------------------------- |
| `GET`  | `/api/health` | Returns `{ "status": "ok" }` for the router process                                |
| `GET`  | `/api/config` | Returns the accepted configuration and actual active listener port                 |
| `PUT`  | `/api/config` | Validates, atomically persists, and publishes a complete replacement configuration |

The whole-document `PUT` supports environment, profile, application, hostname-variant, path-rule, target-mapping, target-selection, listener, and transformation changes. A successful response is:

```json
{
  "configuration": {
    "schemaVersion": 1,
    "listener": { "host": "127.0.0.1", "port": 80 },
    "environments": [{ "id": "local", "displayName": "LOCAL" }],
    "profiles": [],
    "applications": []
  },
  "activePort": 8088
}
```

See [configuration.md](configuration.md) for the complete schema. The `activePort` is authoritative for local launch URLs when a CLI override or interactive fallback is active.

V1 uses the whole-document API for quick target switching as well as structural edits. The UI reads the latest accepted document, changes one rule's `selectedEnvironmentId`, and submits the complete candidate through the same validation and atomic-publication path.

## Errors

Errors use `{ "error": { "code", "message", "details"? } }`. Validation details contain safe `{ "path", "message" }` entries. Codes are `VALIDATION_ERROR`, `CONFLICT`, `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`, `FORBIDDEN_ORIGIN`, `METHOD_NOT_ALLOWED`, `PERSISTENCE_ERROR`, `NOT_FOUND`, and `INTERNAL_ERROR`.

Typical statuses are 400 for malformed JSON, 403 for a rejected origin, 404 for an unknown endpoint, 405 for a method mismatch, 413 for a large payload, 415 for a content-type mismatch, 422 for configuration validation, and 500 for persistence failure. Failures never publish a partial snapshot.

## Proxy Resolution Contract

For a proxy request, the server:

1. Resolves an enabled hostname variant case-insensitively.
2. Resolves an enabled path rule using exact, longest-prefix, then default precedence.
3. Resolves the rule's selected environment to a target mapping.
4. Applies variant profiles if enabled for the rule.
5. Applies the rule's transformations.
6. Sets `Host` from the selected target and streams the request.

Disabled hostname variants do not proxy. Disabled exact or prefix rules fall through to the next eligible match. Invalid configuration cannot produce a rule whose selected environment lacks a target.

## HTTP Proxy Contract

The proxy accepts local HTTP requests and forwards to HTTP or HTTPS targets. It preserves the method, incoming path and query, streaming body, response status and headers, redirects, compression, SSE, and streaming response body.

If the target includes a path or query, those prefix the complete incoming path and query. V1 does not strip the matched prefix or perform response, cookie, redirect, or body rewriting. The upstream `Host` is the selected target host. Hop-by-hop headers are managed by the proxy.

HTTP and HTTPS connections use separate reusable agents. HTTPS uses normal certificate-chain and hostname validation.

## WebSocket Contract

WebSocket upgrades use the same hostname, path-rule, environment, target, profile, and transformation resolution as ordinary HTTP requests. HTTP targets receive a `ws` connection and HTTPS targets receive `wss`, with TLS validation enabled.

The proxy preserves the upgrade request path/query and streams duplex traffic without message buffering.

## Failure Contract

Unknown and disabled hostnames receive lightweight HTML pages linking to the actual management URL. Missing upstream connectivity returns 502; upstream timeouts return 504. DNS, connection, and TLS failures should be classified for concise user-facing diagnostics without exposing configured header values, bodies, filesystem paths, or stack traces.

HTTP and WebSocket upstream connections time out after 30 seconds while establishing or awaiting activity.
