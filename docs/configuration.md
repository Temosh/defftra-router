# Configuration

## User Experience

Normal configuration is performed through the Web UI. Manual file editing is not required and may be rejected if it produces an invalid document.

Environment, profile, application, hostname-variant, rule, target, and target-selection changes become active immediately after a successful management API update. Listener host and port changes are persisted by the same API but take effect on the next startup.

## Storage

Configuration is stored as human-readable, schema-versioned JSON in the platform-appropriate per-user application-data directory:

- Windows: `%LOCALAPPDATA%\Defftra Router\config.json`, falling back to `%APPDATA%`.
- macOS: `~/Library/Application Support/Defftra Router/config.json`.
- Other platforms: `$XDG_CONFIG_HOME/defftra-router/config.json`, falling back to `~/.config/defftra-router/config.json`.

The CLI `--config` option can select an explicit file for development and testing.

Do not store configuration in the repository, current working directory, or an API-provided path by default. Do not use a database.

## Safe Writes

Persist a complete validated document to a uniquely named sibling temporary file, flush and close it, then atomically replace the active file. A failed write removes its temporary file where possible.

If validation or persistence fails:

- Keep the prior configuration file intact.
- Keep the prior in-memory routing snapshot active.
- Return a useful, non-sensitive error to the UI.

## Startup

On startup:

1. Resolve the application-owned data location.
2. Read the configuration if it exists.
3. Parse and validate its schema version and complete content.
4. Publish one immutable active snapshot.

Invalid persisted configuration produces a clear configuration error and is not silently discarded or overwritten.

## Sensitive Values

Header values may contain credentials or tokens. Do not log them, include them in telemetry, or expose them outside the management UI/API. The project does not collect telemetry or transmit configuration externally.

V1 stores configured header values in the local JSON file. Environment-variable substitution and operating-system secret storage are deferred.

## Schema Version 1

The project has not been released. This target schema version 1 replaces the earlier scaffold schema without a migration.

```json
{
  "schemaVersion": 1,
  "listener": { "host": "127.0.0.1", "port": 80 },
  "environments": [
    { "id": "local", "displayName": "LOCAL" },
    { "id": "test", "displayName": "TEST" }
  ],
  "profiles": [
    {
      "id": "profile-a",
      "displayName": "Profile A",
      "transformations": [
        { "operation": "SET", "name": "x-example-mode", "value": "a" }
      ]
    }
  ],
  "applications": [
    {
      "id": "example-app",
      "displayName": "Example App",
      "variants": [
        {
          "id": "example-default",
          "displayName": "Default",
          "hostname": "example.localhost",
          "enabled": true,
          "profileIds": []
        },
        {
          "id": "example-profile-a",
          "displayName": "Profile A",
          "hostname": "profile-a.example.localhost",
          "enabled": true,
          "profileIds": ["profile-a"]
        }
      ],
      "rules": [
        {
          "id": "example-api",
          "displayName": "API",
          "enabled": true,
          "match": { "type": "PREFIX", "pathname": "/api" },
          "targets": [
            {
              "environmentId": "local",
              "url": "http://127.0.0.1:8080/"
            },
            {
              "environmentId": "test",
              "url": "https://api-test.example.invalid/"
            }
          ],
          "selectedEnvironmentId": "local",
          "applyVariantProfiles": true,
          "transformations": []
        },
        {
          "id": "example-default",
          "displayName": "Frontend",
          "enabled": true,
          "match": { "type": "DEFAULT" },
          "targets": [
            {
              "environmentId": "local",
              "url": "http://127.0.0.1:5173/"
            },
            {
              "environmentId": "test",
              "url": "https://frontend-test.example.invalid/"
            }
          ],
          "selectedEnvironmentId": "test",
          "applyVariantProfiles": false,
          "transformations": []
        }
      ]
    }
  ]
}
```

## Environment Rules

- `environments` is ordered for display.
- The first entry is always `{ "id": "local", "displayName": "LOCAL" }`.
- The reserved entry cannot be removed, renamed, or duplicated.
- All other IDs and display names are user-defined.
- Environment display names are unique case-insensitively.
- Removing an environment requires first removing all target mappings and selections that reference it.
- An environment definition does not contain a global URL. Each path rule maps that environment to its own upstream URL.

This design allows `LOCAL` to mean different loopback ports for different rules and allows the same remote environment to use different services.

## Path Rules And Targets

- Every application contains exactly one enabled `DEFAULT` rule.
- `EXACT` and `PREFIX` matches require a normalized pathname beginning with `/`.
- `DEFAULT` does not accept a pathname.
- Duplicate exact paths and duplicate normalized prefixes within an application are invalid.
- A rule has at most one target mapping per environment.
- `selectedEnvironmentId` must reference one of that rule's targets.
- Target URLs are absolute `http:` or `https:` URLs without credentials or fragments.
- Target paths prefix the complete incoming path; matching does not implicitly rewrite or strip it.

## Profiles And Transformations

- Profile IDs referenced by variants must exist.
- A variant cannot reference the same profile more than once.
- Profiles apply in reference order when a matched rule has `applyVariantProfiles: true`.
- Rule transformations apply after profile transformations.
- Header names are normalized to lowercase.
- Unknown fields are rejected at every level.

## Limits

IDs are opaque non-empty strings up to 128 characters; the UI generates UUIDs. Display names are at most 160 characters. Hostnames are at most 253 characters. URLs are at most 2048 characters. A profile or rule has at most 100 transformations. Reasonable upper bounds must also be enforced for environments, profiles, applications, variants, rules, and targets to protect the local management API from oversized configurations.

Listener hosts are restricted to `127.0.0.1` and `::1`; configured ports are 1–65535.
