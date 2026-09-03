# UI Requirements

## Principles

The React UI is clean, compact, developer-oriented, keyboard-usable, and responsive to long hostnames, targets, and header names. Prefer clarity and fast configuration over decorative complexity.

The production UI is compiled by Vite and served by the Defftra Router Node.js process at the reserved `defftra.localhost` hostname.

## Application Dashboard

Group routes by exact upstream target URL. Each card shows:

- Optional user-defined application name, falling back to the exact upstream target.
- Exact upstream target.
- Every configured route as a clearly labeled one-click launch option.
- Each route's actual local URL, including the listener port when it is not 80.
- A concise indication of disabled routes; whether they remain visible here is still to be decided.
- A direct path to route configuration.

Selecting a route launches that exact hostname so users can choose among multiple configured flows for the same application with one click.

## Route Management

The main configuration screen shows:

- Enabled state.
- Display name.
- Hostname and actual local URL.
- Upstream target.
- Concise transformation summary.
- Open, Edit, Duplicate, Delete, and Enable/Disable actions.
- An obvious Add Route action.

Deletion requires explicit confirmation. Open must use the actual route URL.

## Route Editor

The editor contains:

- Display name.
- Hostname.
- HTTP upstream target.
- Enabled toggle.
- Ordered request-header transformation rows.

Each transformation row contains an operation selector, arbitrary header-name input, value input for `SET` and `APPEND`, and accessible delete/reorder controls. `REMOVE` does not require a value.

Show field-level validation inline, preserve the draft after a failed save, and prevent duplicate submissions.

## Required States

Provide deliberate loading, empty, saving, validation-error, persistence-error, and connection-error states. Unknown-host and disabled-route pages should be lightweight, explain the issue, and link to the actual management URL.

User-controlled names, hostnames, targets, and values must be rendered through safe React text rendering. Do not inject raw HTML.

## Accessibility

- All actions must be reachable by keyboard.
- Inputs and validation messages need programmatic labels and associations.
- Reordering must have an accessible non-drag alternative.
- Confirmation and error focus behavior must be deliberate.
- Do not rely on color alone to communicate enabled or error state.
