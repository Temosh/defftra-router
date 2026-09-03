# Configuration

## User Experience

Normal configuration is performed through the Web UI. Manual file editing is not required and may be rejected if it produces an invalid document.

Route and group-name changes become active immediately after a successful management API mutation; the Node.js process does not restart. Listener host and port changes are persisted by the same API but take effect on the next startup.

## Storage

Configuration is stored as human-readable, schema-versioned JSON in the platform-appropriate per-user application-data directory:

- Windows: `%LOCALAPPDATA%\Defftra Router\config.json`, falling back to `%APPDATA%`.
- macOS: `~/Library/Application Support/Defftra Router/config.json`.
- Other platforms: `$XDG_CONFIG_HOME/defftra-router/config.json`, falling back to `~/.config/defftra-router/config.json`.

The CLI `--config` option can select an explicit file for development and testing.

Do not store configuration in the repository, current working directory, or an API-provided path by default. Do not use a database.

## Safe Writes

Persist a complete validated document to a uniquely named sibling temporary file, flush and close it, then atomically replace the active file. A failed write removes its temporary file where possible. Temporary files left by an interrupted process are not yet cleaned automatically on startup.

If validation or persistence fails:

- Keep the prior configuration file intact.
- Keep the prior in-memory routing snapshot active.
- Return a useful, non-sensitive error to the UI.

## Startup

On startup:

1. Resolve the application-owned data location.
2. Read the configuration if it exists.
3. Parse and validate its schema version and complete content.
4. Migrate only through explicit, tested schema migrations.
5. Publish one immutable active snapshot.

Invalid persisted configuration must produce a clear configuration error and must not be silently discarded or overwritten.

## Sensitive Values

Header values may contain credentials or tokens. Do not log them, include them in telemetry, or expose them outside the management UI/API. The project does not collect telemetry or transmit configuration externally.

## Schema Version 1

```json
{
  "schemaVersion": 1,
  "listener": { "host": "127.0.0.1", "port": 80 },
  "routes": [
    {
      "id": "7f2d0f08-514c-495e-8b22-76eb9bbb8b93",
      "displayName": "App with test headers",
      "hostname": "app-test.localhost",
      "target": "http://127.0.0.1:3000/",
      "enabled": true,
      "transformations": [
        { "operation": "SET", "name": "x-example-mode", "value": "test" },
        { "operation": "REMOVE", "name": "x-old-mode" }
      ]
    }
  ],
  "groupDisplayNames": [
    { "target": "http://127.0.0.1:3000/", "displayName": "Example app" }
  ]
}
```

IDs are opaque non-empty strings up to 128 characters; the UI generates UUIDs. Hostnames and header names are normalized to lowercase, and target URLs are normalized through the URL parser. Unknown properties are rejected. Listener hosts are restricted to `127.0.0.1` and `::1`; ports are 1–65535.

Version 1 has no migrations or backup file. Unsupported versions fail validation without changing the active file or snapshot.
