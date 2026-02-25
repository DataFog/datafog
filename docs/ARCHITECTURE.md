# Architecture

## Purpose

- **System purpose:** evaluate policy for sensitive actions, return a deterministic enforcement decision, and keep an auditable trail.
- **Primary users:** AI/automation agents, platform engineers, security teams, and CLI tool users running command wrappers.
- **Main runtime pieces:** HTTP API (`cmd/datafog-api`), policy engine (`internal/policy`), detector stack (`internal/scan`), transform engine (`internal/transform`), and policy gate (`cmd/datafog-shim`, `internal/shim`).
- **Primary flows:** policy decision serving, text scanning/transforming, and policy gate-based command/file enforcement.

## Codemap (Where To Change Code)

- `cmd/datafog-api/main.go` -> application bootstrapping, env-var config, policy + receipt initialization, graceful shutdown.
- `internal/server/server.go` -> route registration and all API handlers (`/v1/scan`, `/v1/decide`, `/v1/transform`, `/v1/anonymize`, `/v1/receipts/{id}`, `/v1/events`, `/metrics`, optional demo routes).
- `internal/policy/policy.go` -> policy validation, matching logic, precedence, and decision outcomes.
- `internal/models/models.go` -> shared request/response/domain types used by API, policy, and receipts.
- `internal/scan` -> deterministic text detectors (`detector.go` and heuristic NER in `ner.go`).
- `internal/transform/transform.go` -> deterministic redaction/transformation implementation and stats.
- `internal/receipts/store.go` -> append-only receipt persistence and retrieval.
- `cmd/datafog-shim/main.go` -> CLI command parser and runtime guardrails for shell/commands/files.
- `internal/shim` -> request adaptation, adapter matching, enforcement mode handling, and event sinks.

### Flow

`Client`/agent request → `internal/server` route handler → `internal/policy` evaluator + `internal/scan` (when needed) → optional `transform` path → `ReceiptStore` write → JSON response with `receipt_id`.

For enforcement: CLI/tool action → `datafog-shim` policy gate → `POST /v1/decide` on DataFog API → execute-or-block in `internal/shim` adapter.

## Invariants (Must Remain True)

- API policy loading is static for a process lifetime (`DATAFOG_POLICY_PATH` loaded at startup).
- `/health` and `/v1/policy/version` do not mutate state.
- No secrets are logged or returned in API responses.
- Decision side effects are request-scoped and serialized into receipts before returning a `decide` response.
- If a request includes idempotency keys, repeated requests must return identical status/body or a conflict error.
- Unsupported or unauthenticated requests fail closed (`401`, `4xx`, or `405`) before any enforcement action.

## Details Live Elsewhere

- `docs/contracts/datafog-api-contract.md` — API request/response contracts.
- `docs/DESIGN.md` — design principles.
- `docs/PRODUCT_SENSE.md` — users/outcomes/heuristics.
- `docs/SECURITY.md` — threat model and controls.
- `docs/RELIABILITY.md` and `docs/OBSERVABILITY.md` — operations and checks.
