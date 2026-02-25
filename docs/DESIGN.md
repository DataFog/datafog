---
title: "Design"
use_when: "Documenting API and enforcement design principles, behavior expectations, and consistency standards for DataFog."
---

## Design Principles

- **Policy-first behavior:** every protected action follows the same decision flow through policy, not ad-hoc command-specific exceptions.
- **Deterministic results:** identical request + policy inputs must yield identical decisions and transform outputs.
- **Fail-closed defaults:** unknown actions, unsupported modes, and missing context should prefer safe denial.
- **Operational transparency:** every meaningful action is observable (receipts, logs, request IDs, metrics).
- **Minimal privilege runtime:** API and policy-gate defaults should require explicit opt-in and avoid broad permissions.

## Visual/API Direction

- Keep API responses stable and machine-parseable with consistent field names (`request_id`, `trace_id`, `policy_id`, `policy_version`, `receipt_id`).
- Error objects should always include a machine-readable `code` plus a short human message.
- Use plain, documented environment variables and startup defaults so behavior is scriptable and inspectable.

## Interaction Standards

- Endpoints use standard HTTP semantics (`GET` read-only, `POST` for stateful decisions/transforms).
- Every call should include `Content-Type: application/json` where applicable and support deterministic JSON decoding.
- Idempotency behavior is explicit and user-visible for high-risk endpoints.
- `/health` and read endpoints are safe and should remain side-effect free.
- For enforcement failures, return the structured decision/receipt evidence path so downstream tooling can audit and retry safely.
