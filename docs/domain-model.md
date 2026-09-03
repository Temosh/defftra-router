# Domain Model

## Route

A route contains:

- Opaque stable ID.
- Display name.
- `.localhost` hostname.
- Exact HTTP upstream target URL.
- Enabled/disabled state.
- Ordered request-header transformations.

Hostnames are compared case-insensitively and must be unique after normalization. `defftra.localhost` is reserved and cannot be configured as a route. The local URL uses the route hostname plus the active listener port when the port is not 80.

## Header Transformation

A transformation contains an operation, arbitrary valid HTTP header name, and a value where the operation requires one.

| Operation | Required value | Behavior |
|-----------|----------------|----------|
| `SET` | Yes | Add the header or replace all existing values |
| `APPEND` | Yes | Add another value while preserving existing values |
| `REMOVE` | No | Remove all values for the header |

Header names are case-insensitive. Transformations execute in list order, so later operations observe earlier results. Validation must use HTTP header-name rules and must not assign semantic meaning to any particular name.

The exact wire representation used by `APPEND` for special non-combinable headers remains an implementation decision and requires tests.

## Application Group

An application group is derived from every route sharing the same exact normalized upstream target URL. It is a dashboard projection rather than a separately routable entity.

A group may have an optional user-defined display name. Every route in a group remains a separate launch option because different transformations can represent different ways to enter the same application. The persistence representation for group-name metadata is not yet fixed.

## Persisted Configuration

The persisted document contains:

- A schema version.
- Listener settings, including configurable port.
- Routes.
- Optional application-group display metadata.

The concrete JSON property names and migration rules are deferred until the configuration schema is designed.

## Invariants

- IDs are stable and unique.
- Normalized route hostnames are unique.
- Route hostnames end in `.localhost` and do not equal the reserved management hostname.
- Upstream targets use HTTP in V1 and are valid absolute URLs.
- Transformation order is stable.
- `SET` and `APPEND` require values; `REMOVE` does not accept a value.
- Invalid candidates never replace persisted or active configuration.
- Routes that differ only in header-name casing behave identically for transformation purposes.
- Disabled routes are retained but cannot proxy traffic.
