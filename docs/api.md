# Management API And Proxy Contracts

## Transport

The JSON API is served only when the normalized `Host` is `router.localhost`, on the same loopback listener as proxy traffic. API responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Mutation requests with an `Origin` header must exactly match the active management origin.

The maximum JSON request body is 1 MiB. Unknown fields are rejected at every configuration level.

## Endpoints

| Method | Path          | Behavior                                                                           |
| ------ | ------------- | ---------------------------------------------------------------------------------- |
| `GET`  | `/api/health` | Returns `{ "status": "ok" }`                                                       |
| `GET`  | `/api/config` | Returns the accepted configuration and actual active listener port                 |
| `PUT`  | `/api/config` | Validates, atomically persists, and publishes a complete replacement configuration |

The whole-document `PUT` supports route creation, editing, duplication, deletion, enable/disable changes, transformation reordering, listener settings, and group display names. A successful response is:

```json
{
  "configuration": {
    "schemaVersion": 1,
    "listener": { "host": "127.0.0.1", "port": 80 },
    "routes": [],
    "groupDisplayNames": []
  },
  "activePort": 8088
}
```

See [configuration.md](configuration.md) for the complete schema. The `activePort` is authoritative for local launch URLs when a CLI override or interactive fallback is active.

## Errors

Errors use `{ "error": { "code", "message", "details"? } }`. Validation details contain safe `{ "path", "message" }` entries. Codes are `VALIDATION_ERROR`, `CONFLICT`, `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`, `FORBIDDEN_ORIGIN`, `METHOD_NOT_ALLOWED`, `PERSISTENCE_ERROR`, `NOT_FOUND`, and `INTERNAL_ERROR`.

Typical statuses are 400 for malformed JSON, 403 for a rejected origin, 404 for an unknown endpoint, 405 for a method mismatch, 413 for a large payload, 415 for a content-type mismatch, 422 for configuration validation, and 500 for persistence failure. Failures never publish a partial snapshot.

## Proxy Contract

For an enabled matching hostname, the proxy preserves the method, incoming path and query, streaming body, response status and headers, redirects, and streaming response body. Redirect status and `Location` are preserved, but redirect responses override upstream caching directives with `Cache-Control: no-store`, `Pragma: no-cache`, and `Expires: 0` so browsers do not retain local-development redirects. If the target includes a path or query, those prefix the incoming path and query. The upstream `Host` is the target host. Hop-by-hop headers are managed by the proxy.

WebSocket upgrades are forwarded through a direct duplex tunnel. HTTP and WebSocket upstream connections time out after 30 seconds while establishing or awaiting activity.

Unknown and disabled hosts receive lightweight HTML pages linking to the actual management URL. Connection failures return 502; upstream timeouts return 504. Errors never include configured header values, bodies, filesystem paths, or stack traces.
