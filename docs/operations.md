# Operations

## Supported Environment

- Primary: Windows 11 without administrator rights.
- Secondary: macOS; the minimum supported version remains to be selected.
- Runtime: Node.js 26.
- Package manager for development: pnpm.

Defftra Router requires no Docker daemon, database, external service, or Internet connection at runtime.

## CLI Startup

The installed command is intended to be `defftra-router`. It starts one foreground Node.js process and does not open a browser automatically.

The listener address and port are configurable. Defaults are:

- Loopback-only binding.
- Port 80.
- Management hostname `defftra.localhost`.

If the configured/default port cannot be bound and stdin is interactive, the CLI asks whether to retry on port 8088. It never changes ports silently. Non-interactive failure behavior remains to be specified.

Always print the actual listening and management URLs, including the port when it is not 80.

## Shutdown

Handle normal process termination by stopping new connections, closing the listener, allowing a bounded graceful drain, closing upstream agents/sockets, and completing any in-progress configuration write safely.

## Logging

Default logging includes:

- Startup.
- Listening address and management URL.
- Configuration errors.
- Proxy failures.

Optional debug logging may include matched route identity, method/path, target, and timing. Never log request/response bodies or configured/request header values by default.

Do not retain persistent or in-memory request history and do not emit telemetry.

## Failure Behavior

| Failure | Expected behavior |
|---------|-------------------|
| Unknown hostname | Lightweight local page with management link |
| Disabled route | Explain that the route is disabled and link to management |
| Invalid persisted configuration | Clear startup error; do not overwrite the file |
| Invalid API candidate | Inline-capable validation response; keep prior snapshot |
| Unsupported upstream protocol | Reject during validation |
| Upstream unavailable | Useful gateway-style response and minimal error log |
| Upstream timeout | Abort cleanly and return a useful timeout response |
| Listener bind failure | Interactive offer to retry on 8088 |

## Resource Verification

Before calling V1 release-ready, measure idle RAM and CPU on supported Windows and macOS environments, verify that no polling timers keep the process active, and exercise repeated HTTP/WebSocket connections for leaks.
