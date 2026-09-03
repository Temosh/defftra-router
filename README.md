# Defftra Router

Defftra Router is a lightweight local HTTP reverse proxy for developers. It gives local applications memorable `.localhost` addresses and can apply ordered request-header changes before forwarding traffic to an application.

For example, two routes can open the same local server with different request headers:

```text
app-test.localhost
    -> http://127.0.0.1:3000
    -> SET x-example-mode = test

app-standard.localhost
    -> http://127.0.0.1:3000
    -> no header changes
```

Routes are managed through a local Web UI. No browser extension, hosts-file change, Docker container, database, or modification to the proxied application is required.

## Features

- Routes `.localhost` hostnames to local HTTP servers.
- Applies ordered `SET`, `APPEND`, and `REMOVE` request-header operations.
- Groups routes that target the same application and provides one-click launch links.
- Applies route changes immediately without restarting.
- Streams HTTP request and response bodies instead of buffering them.
- Proxies WebSocket upgrades.
- Stores configuration as human-readable, versioned JSON.
- Binds to loopback by default and sends no telemetry.

## Requirements

- Node.js 26.
- pnpm 10 or newer to install dependencies and create a build.
- Windows 11 or macOS. Other Node.js platforms may work but are not currently supported targets.

Only Node.js is required to run an already-built `dist/` deliverable.

## Build From Source

Clone the repository, then run:

```bash
pnpm install --frozen-lockfile
pnpm build
```

The complete runnable application is created in `dist/`. The Node.js CLI, proxy server, and management API are bundled into `defftra-router.mjs`; the compiled Web UI is under `ui/`. Keep the contents of that directory together.

To share the current build with a colleague, archive or copy the entire `dist/` directory. They do not need the source tree, pnpm, or `node_modules`; they only need Node.js 26.

## Run

Enter the `dist/` directory. Every build includes launchers for Windows and macOS.

### Windows

Double-click `run-windows.cmd`, or run it from Command Prompt or PowerShell:

```bat
run-windows.cmd
```

### macOS

Double-click `run-macos.command`, or run it from Terminal:

```bash
./run-macos.command
```

### Direct Node.js Command

The launchers ultimately run the same CLI. You can invoke it directly:

```bash
node defftra-router.mjs
```

By default, Defftra Router listens on loopback port 80. It prints the actual listener and management URLs when startup succeeds:

```text
Defftra Router listening on http://127.0.0.1:80
Management UI: http://router.localhost
```

The process stays in the foreground. Press `Ctrl+C` to stop it cleanly. Both platform launchers verify that Node.js 26 or newer is available and print a clear error if it is missing.

### Use An Unprivileged Port

Port 80 may already be occupied or may require elevated privileges on macOS. Pass port 8088 to the appropriate launcher instead:

```bat
run-windows.cmd --port 8088
```

```bash
./run-macos.command --port 8088
```

Then open `http://router.localhost:8088`. Route URLs must use the same port, for example `http://app-test.localhost:8088`.

On an interactive terminal, a failed attempt to bind port 80 offers to retry on port 8088. In a non-interactive environment, a bind failure exits with an error instead of silently selecting another port.

## Configure Your First Route

1. Start the router and open the printed management URL.
2. Open **Routes** and select **Add route**.
3. Enter a display name such as `Example app`.
4. Enter a unique hostname ending in `.localhost`, such as `app.localhost`.
5. Enter the running application's HTTP URL, such as `http://127.0.0.1:3000`.
6. Add any request-header operations needed by that route.
7. Save the route.
8. Open it from the dashboard or browse directly to its displayed local URL.

The upstream application must already be running. Defftra Router preserves the incoming method, path, query, request body, response status, response headers, and response body. When an upstream target contains a path or query, it prefixes the incoming path or query.

### Header Operations

Header names are case-insensitive, and operations run from top to bottom:

| Operation | Behavior                                            |
| --------- | --------------------------------------------------- |
| `SET`     | Adds the header or replaces all existing values     |
| `APPEND`  | Preserves existing values and appends another value |
| `REMOVE`  | Removes all values for the header                   |

Header values can contain sensitive information. They are stored locally in the configuration file and shown in the management UI, but they are not written to request logs or sent as telemetry.

## Command-Line Options

```text
--port <number>       Override the configured listener port
--host <address>      Bind 127.0.0.1 or ::1
--config <path>       Use a specific configuration file
-h, --help            Show help
-v, --version         Show version
```

Examples:

```bash
node defftra-router.mjs --host 127.0.0.1 --port 8088
node defftra-router.mjs --config ./router-config.json --port 8088
```

CLI host and port options override the persisted listener settings for the current process. Route changes become active immediately. Persisted listener changes take effect on the next startup.

## Configuration Location

The configuration file is created automatically on first startup:

| Platform | Default path                                                                            |
| -------- | --------------------------------------------------------------------------------------- |
| Windows  | `%LOCALAPPDATA%\Defftra Router\config.json`                                             |
| macOS    | `~/Library/Application Support/Defftra Router/config.json`                              |
| Other    | `$XDG_CONFIG_HOME/defftra-router/config.json` or `~/.config/defftra-router/config.json` |

Use `--config` to select another file. Normal configuration should be done through the Web UI. If a manually edited file is invalid, startup fails without overwriting it.

## Troubleshooting

### The router cannot bind its port

Another process may already be using the port, or the operating system may restrict it. Retry with an available unprivileged port:

```bash
node defftra-router.mjs --port 8088
```

### The management page or route does not open

Use the exact URL printed by the router. When the listener is not on port 80, both the management URL and every route URL must include the active port.

### A route returns “upstream unavailable”

Confirm that the target application is running and that its configured target begins with `http://`. HTTPS upstreams are not supported in the current version.

### Startup reports an invalid configuration

The existing file is preserved. Correct the reported field in the JSON file or start with `--config` pointing to a separate valid configuration. Do not put real credentials into issue reports or shared logs.

## Current Limitations

- Listener and upstream connections are HTTP only; HTTPS is not supported.
- The router is intended for local development and is not a production security boundary.
- It does not provide remote administration, accounts, traffic history, response rewriting, or request-body rewriting.
- No installer or registry package is published yet; the portable `dist/` directory can be distributed as a single archive.
- Idle resource targets and minimum supported macOS/browser versions still require release validation.
