# Node.js, TypeScript, And React Stack Rules

Use these rules for a resource-conscious single-package application with a Node.js CLI/server and a React UI compiled to static assets.

## Runtime And Tooling

- Target Node.js 26 and TypeScript.
- Use pnpm and commit `pnpm-lock.yaml`.
- Use ECMAScript modules unless an identified dependency or packaging constraint requires otherwise.
- Use latest stable tool and library versions compatible with the selected Node.js version when first adding them. Upgrade deliberately rather than opportunistically afterward.
- Expose consistent `dev`, `build`, `start`, `test`, `lint`, and `format` scripts.
- Use ESLint for linting and Prettier for formatting.
- Follow `architecture-node-react-full-stack.md` for source ownership and dependency direction.
- Never invent or report commands that are not present and verified.

## Runtime Shape

- Run the CLI, HTTP server, and production static-asset server in one Node.js process unless a documented requirement justifies another process.
- Treat Vite as development and build tooling, not as the production server.
- Keep listener addresses, ports, protocols, and fallback behavior in project documentation rather than hardcoding them into reusable infrastructure.
- Start and stop cleanly: validate startup state before listening and release listeners, agents, sockets, and pending writes during graceful shutdown.

## Resource Discipline

- Idle work must be event-driven. Do not add polling loops or unnecessary background workers.
- Stream large or unbounded payloads. Whole-payload buffering requires a documented, operation-specific justification and an enforced size limit.
- Reuse connections where appropriate and release resources deterministically.
- Do not retain unbounded histories, payloads, or event collections in memory.
- Measure resource impact before adopting a heavyweight framework or runtime library.

## Server

- Prefer Node.js built-in HTTP, streaming, filesystem, and networking APIs.
- A focused protocol dependency is acceptable when it materially reduces correctness or security risk; document the choice.
- Keep timeouts, cancellation, connection reuse, backpressure, and shutdown behavior explicit.
- Validate method, content type, body size, URL-like input, and complete payload schemas at transport boundaries.
- Keep protocol adapters thin; business rules belong in `core`.
- Document intentional changes to forwarded or returned protocol data and cover them with integration tests.

## Frontend

- Use React with TypeScript.
- Use Vite for frontend development and static production builds.
- Serve compiled UI assets from the Node.js process in production; do not add a second runtime frontend server.
- Prefer local React state and the built-in Fetch API.
- Add routing, server-state, global-state, form, or component libraries only after demonstrated need.
- Keep the UI keyboard-usable and accessible. Provide inline validation and explicit empty, loading, saving, and error states.
- Render user-controlled content as text through React. Do not inject raw HTML.

## Dependencies

- Prefer platform APIs and existing dependencies before adding packages.
- Production dependencies must be small, actively maintained, and justified by correctness or meaningful complexity reduction.
- Do not add a heavyweight server framework without measured justification.
- Do not introduce duplicate libraries for the same concern.
- Keep build and test packages in `devDependencies`.
- Describe dependency additions and their runtime or bundle implications in change summaries.

## Configuration And Persistence

- Validate persisted and API-provided configuration at runtime.
- Keep persisted formats human-readable and explicitly schema-versioned when practical.
- For whole-document file persistence, write a complete candidate to a sibling temporary file, flush and close it, then atomically replace the active file.
- Publish new in-memory state only after validation and required persistence succeed.
- Keep user-controlled paths within application-owned locations.
- Treat configuration values as potentially sensitive and avoid logging or transmitting them.

## HTTP API

- Keep JSON-over-HTTP APIs small and document concrete routes and schemas in project documentation.
- Reject unsupported methods, media types, oversized bodies, invalid fields, and unknown enum values at the boundary.
- Protect browser-facing mutation endpoints against unintended cross-origin access and Host confusion.
- Return stable machine-readable error codes and safe human-readable messages.
- Do not expose secrets, filesystem paths, stack traces, or raw internal errors.

## Testing

- Use Vitest for domain, server, persistence, and integration tests.
- Use React Testing Library for component behavior.
- Use Playwright only for critical browser workflows; keep end-to-end coverage focused.
- Use ephemeral loopback servers and temporary directories.
- Tests must not require Internet access, administrator rights, fixed ports, or pre-existing local services.
- Test streaming, cancellation, failure paths, live state changes, persistence recovery, and upgraded protocols when the application relies on them.

## Logging And Telemetry

- Keep default logging concise and operational.
- Debug logs may include non-sensitive identifiers, method/path, destination, and timing.
- Do not log bodies, credentials, tokens, or other sensitive values.
- Telemetry is opt-in only and requires an explicit documented product decision.
