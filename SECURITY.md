# Security Policy

## Boundary

Defftra Router is a local development tool, not a production security boundary. It accepts HTTP traffic and HTTP upstream targets only in V1 and binds to loopback by default. Do not expose it to a LAN or the Internet.

Configuration may contain sensitive header values. Defftra Router does not log request bodies or header values, retain traffic history, collect telemetry, or transmit configuration externally. Protect the local operating-system account and configuration file accordingly.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately through the repository host's security-reporting feature. Include a concise reproduction, affected version or commit, and expected impact. Do not include real credentials or user data.

Public issues are appropriate for ordinary bugs that do not expose sensitive values, enable unintended network access, or cross the documented local boundary.
