# Configuration

## User Experience

Normal configuration is performed through the Web UI. Manual file editing is not required and may be rejected if it produces an invalid document.

Changes become active immediately after a successful management API mutation; the Node.js process does not restart.

## Storage

Configuration is stored as human-readable, schema-versioned JSON in the platform-appropriate per-user application-data directory. The precise Windows and macOS paths will be documented when the CLI package identity and storage adapter are implemented.

Do not store configuration in the repository, current working directory, or an API-provided path by default. Do not use a database.

## Safe Writes

Persist a complete validated document to a sibling temporary file, flush and close it, then atomically replace the active file. Clean up abandoned temporary files safely on a later startup where practical.

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

## Schema Work Remaining

Before persistence implementation, define and test:

- The initial schema version and JSON property names.
- ID format.
- Listener-setting defaults.
- Optional group-name metadata keyed to exact upstream targets.
- Migration and unsupported-version behavior.
- Backup/recovery behavior, if any.
