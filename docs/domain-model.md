# Domain Model

## Target Environment

A target environment is a user-visible choice that path rules can map to upstream URLs. It contains:

- Opaque stable ID.
- Display name.

The reserved environment has ID `local` and display name `LOCAL`. It is created by default and cannot be renamed or deleted. Every other environment is created, named, ordered, renamed, and deleted by the user. Names such as DEV, UAT, or STAGE are examples only and have no built-in behavior.

Deleting a user-defined environment is invalid while a path rule references it as a target or active selection.

## Application

An application is a configured routing entity containing:

- Opaque stable ID.
- Display name.
- One or more hostname variants.
- Exactly one default path rule.
- Zero or more exact or prefix path rules.

Applications are not inferred from equal target URLs. All hostname variants in an application share its rules and active target selections.

## Hostname Variant

A hostname variant contains:

- Opaque stable ID.
- Display name.
- Unique `.localhost` hostname.
- Enabled/disabled state.
- Ordered references to header profiles.

Variants provide stable, bookmarkable entry points for different request-header contexts without copying the application's rules. Hostnames are compared case-insensitively and must be globally unique after normalization. `router.localhost` is reserved.

A disabled variant remains visible but does not proxy. The local URL includes the active listener port when it is not 80.

## Path Rule

A path rule contains:

- Opaque stable ID.
- Display name.
- Enabled/disabled state.
- Match type: `DEFAULT`, `EXACT`, or `PREFIX`.
- Match pathname for exact and prefix rules.
- Target mappings.
- Selected environment ID.
- Whether to apply the hostname variant's profiles.
- Ordered rule-specific request-header transformations.

Every application has exactly one enabled default rule. Exact paths and normalized prefixes are unique within an application. Matching is case-sensitive, ignores query strings, and uses this precedence:

1. Exact match.
2. Longest matching prefix.
3. Default rule.

Prefix matching is path-segment aware: `/api` matches `/api` and `/api/items`, but not `/apix`. Disabled exact and prefix rules are skipped so matching falls through to the next eligible rule.

## Target Mapping

A target mapping associates one path rule with:

- Target environment ID.
- Absolute HTTP or HTTPS upstream URL.

A rule may support any subset of defined environments. The `LOCAL` environment always exists globally, but each rule must still be given a concrete local target URL before `LOCAL` can be selected for that rule. The UI shows unmapped environments as unavailable rather than inventing URLs or ports.

The selected environment must have a mapping on the rule. Each rule selects independently, so an application can simultaneously use a local frontend, a remote API, and another remote service.

## Header Profile

A header profile contains:

- Opaque stable ID.
- Display name.
- Ordered request-header transformations.

Profiles are reusable and domain-neutral. A variant may reference multiple profiles. For a rule that applies variant profiles, profiles run in reference order, transformations run in profile order, and rule-specific transformations run last.

Labels may describe a developer's intended workflow, but the core assigns no semantic meaning to them.

## Header Transformation

A transformation contains an operation, arbitrary valid HTTP header name, and a value where required.

| Operation | Required value | Behavior                                           |
| --------- | -------------- | -------------------------------------------------- |
| `SET`     | Yes            | Add the header or replace all existing values      |
| `APPEND`  | Yes            | Add another value while preserving existing values |
| `REMOVE`  | No             | Remove all values for the header                   |

Header names are case-insensitive. Transformations execute in list order, so later operations observe earlier results. The proxy sets the upstream `Host` after these operations.

`APPEND` preserves existing logical values and adds the configured value to the end of the array passed to Node.js HTTP. Node's serializer applies protocol-specific combination rules.

## Persisted Configuration

The schema version 1 document contains:

- Listener settings.
- Ordered target environment definitions.
- Header profiles.
- Applications, hostname variants, rules, target mappings, and selections.

The project is prerelease, so the earlier scaffold representation of schema version 1 will be replaced without a compatibility migration.

## Invariants

- IDs are stable and globally unique within their entity collection.
- The reserved `local` environment exists exactly once and remains named `LOCAL`.
- Non-local environment display names are non-empty and unique case-insensitively.
- Normalized hostname-variant hostnames are globally unique.
- Variant hostnames end in `.localhost` and do not equal the reserved management hostname.
- Every application has at least one hostname variant and exactly one enabled default rule.
- Exact match paths and normalized prefix paths are unique within an application.
- Every target mapping references a defined environment.
- Every selected environment has a target mapping on its rule.
- Upstream targets use HTTP or HTTPS and contain no credentials or fragments.
- Profile references resolve to existing profiles.
- Profile and transformation order is stable.
- `SET` and `APPEND` require values; `REMOVE` does not accept one.
- Invalid candidates never replace persisted or active configuration.
- Configuration changes are published only as complete immutable snapshots.
