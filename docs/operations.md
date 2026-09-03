# Operations

## Supported Environment

- Primary: Windows 11 without administrator rights.
- Secondary: macOS; the minimum supported version remains to be selected.
- Runtime: Node.js 26.
- Package manager for development: pnpm.

Defftra Router requires no Docker daemon, database, external service, or Internet connection at runtime.

## Build And Startup

Run `pnpm build` from a dependency-installed checkout to create the standalone `dist/` directory. The build contains the server, CLI, and management API as one `defftra-router.mjs` bundle alongside the compiled UI; it has no runtime package-install step. Keep the directory intact because the bundle resolves the UI relative to itself.

The deliverable includes `run-windows.cmd` and `run-macos.command`. They verify that Node.js 26 or newer is available, locate the CLI relative to themselves, and forward every command-line argument unchanged. Windows users can double-click `run-windows.cmd` or invoke it from Command Prompt or PowerShell. macOS users can double-click `run-macos.command` or invoke it from Terminal.

Run from the repository with `pnpm start`, use the launchers under `dist/`, or run the bundle directly with `node dist/defftra-router.mjs`. From inside `dist/`, use a launcher or run `node defftra-router.mjs`. The package declares a `defftra-router` binary for future packaged distributions, but no registry or platform installer is published yet.

Startup creates one foreground Node.js process and does not open a browser automatically.

The listener address and port are configurable. Defaults are:

- Loopback-only binding.
- Port 80.
- Management hostname `router.localhost`.

If the configured/default port cannot be bound and stdin is interactive, the CLI asks whether to retry on port 8088. It never changes ports silently. In a non-interactive environment, a bind failure prints a concise startup error and exits nonzero.

Always print the actual listening and management URLs, including the port when it is not 80.

Command-line overrides are `--port <number>`, `--host <127.0.0.1|::1>`, and `--config <path>`. `--help` and `--version` are also available. Listener configuration changes are persisted immediately but take effect the next time the process starts; route changes take effect immediately.

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

| Failure                         | Expected behavior                                         |
| ------------------------------- | --------------------------------------------------------- |
| Unknown hostname                | Lightweight local page with management link               |
| Disabled route                  | Explain that the route is disabled and link to management |
| Invalid persisted configuration | Clear startup error; do not overwrite the file            |
| Invalid API candidate           | Inline-capable validation response; keep prior snapshot   |
| Unsupported upstream protocol   | Reject during validation                                  |
| Upstream unavailable            | Useful gateway-style response and minimal error log       |
| Upstream timeout                | Abort cleanly and return a useful timeout response        |
| Listener bind failure           | Interactive offer to retry on 8088                        |

## Resource Verification

Before calling V1 release-ready, measure idle RAM and CPU on supported Windows and macOS environments, verify that no polling timers keep the process active, and exercise repeated HTTP/WebSocket connections for leaks.
