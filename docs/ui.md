# UI Requirements

## Principles

The React UI is clean, compact, developer-oriented, keyboard-usable, and optimized for switching active targets quickly. Prefer application-oriented language and immediate state changes over exposing generic proxy-server configuration concepts.

The production UI is compiled by Vite and served by the Defftra Router Node.js process at the reserved `router.localhost` hostname.

## Application Dashboard

The dashboard groups state by configured application. Each application card shows:

- Application display name.
- Every enabled hostname variant as a one-click launch option.
- Each variant's actual local URL, including the listener port when it is not 80.
- Every path rule and its match.
- The rule's selected environment and target.
- One-click selection among environments mapped on that rule.
- A concise indication of disabled variants or rules.
- Direct paths to application, rule, target, and profile configuration.

Selections are independent per path rule. Switching a target shows progress in the initiating control, persists the new configuration, and takes effect without restarting Defftra.

The UI must not imply that an unmapped environment has an inferred target. It is shown as unavailable for that rule until the user configures a URL.

## Environment Management

The environment screen shows the ordered target-environment list.

- `LOCAL` is always present, visually identified as built in, and cannot be renamed or deleted.
- Users can add, name, rename, reorder, and delete every other environment.
- Environment names are arbitrary; the UI must not provide fixed DEV, UAT, or STAGE semantics.
- Deleting a referenced environment is blocked with precise references to the affected rules.

Environment definitions are names, not global URLs. Concrete target URLs are configured per path rule.

## Profile Management

Users can add, edit, duplicate, reorder, and delete reusable header profiles. A profile editor contains:

- Display name.
- Ordered request-header transformation rows.

Each transformation row contains an operation selector, arbitrary header-name input, value input for `SET` and `APPEND`, and accessible delete/reorder controls. `REMOVE` does not require a value.

Deleting a referenced profile is blocked with precise references to affected hostname variants.

## Application Management

The application editor contains:

- Application display name.
- Hostname variants.
- Shared path rules.

Each hostname variant contains:

- Display name.
- Local hostname with a fixed `.localhost` suffix and actual-URL preview.
- Enabled toggle.
- Ordered profile selection.

Each path rule contains:

- Display name.
- Enabled toggle for exact and prefix rules.
- Match type: Default, Exact, or Prefix.
- Pathname for exact and prefix rules.
- Target URL for every supported environment.
- Selected environment.
- Whether hostname-variant profiles apply.
- Ordered rule-specific transformations.

Every application has exactly one default rule. The UI explains exact, longest-prefix, and default precedence and reports duplicate or conflicting paths inline.

## Quick Mixed-Routing Workflow

The dashboard must make these changes possible without entering the full editor:

- Switch the default/frontend rule between local and user-defined remote environments.
- Switch an API or other prefix rule independently.
- Open the same application through a different hostname/profile variant.

A user should be able to change a rule target, refresh an already-open browser tab, and observe the new routing immediately.

## Required States

Provide deliberate loading, empty, saving, validation-error, persistence-error, and connection-error states. Unknown-host, disabled-variant, unmatched-rule, and unavailable-target pages should be lightweight, explain the issue, and link to the actual management URL.

Show field-level validation inline, preserve drafts after failed saves, and prevent duplicate submissions. Fast inline target and enabled-state changes must not shift surrounding content. Save failures remain visibly persistent.

User-controlled names, hostnames, targets, and values are rendered through safe React text rendering. Do not inject raw HTML.

## Compatibility Guidance

Application configuration explains that path routing affects only relative requests addressed to the Defftra hostname. Absolute API or WebSocket URLs and calls made by remote servers bypass the local router.

Do not imply that Defftra can bypass OAuth redirect-URI registration, cookie policy, Content Security Policy, or other upstream security behavior.

## Accessibility

- All actions are reachable by keyboard.
- Inputs and validation messages have programmatic labels and associations.
- Reordering has an accessible non-drag alternative.
- Confirmation and error focus behavior is deliberate.
- Target selection exposes selected, unavailable, saving, and failed states without relying on color alone.
