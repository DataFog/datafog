---
title: "Data"
use_when: "Capturing data model and data-change safety rules for this repo."
---

## Data Model

DataFog is intentionally storage-light and file-backed by default.

- **Policy source:** JSON at `DATAFOG_POLICY_PATH` (default `config/policy.json`).
- **Decision receipts:** immutable JSON lines in `DATAFOG_RECEIPT_PATH` (default `datafog_receipts.jsonl`).
- **Decision events (optional):** NDJSON entries in `DATAFOG_EVENTS_PATH`.
- **Domain types:** policy, request, decision, finding, transform plan, and receipts are defined in `internal/models/models.go` and mirrored in the API contract.

## Migrations

There is no database migration layer in this repository. Policy and storage evolution is file-based:

- Policy changes require replacing `policy.json` and restarting the service.
- Receipt retention/rotation is performed by `internal/receipts` through `maxEntries` options and file archival rules.
- Any migration of persistent data (for receipts/events) must include a compatibility plan before rollout.

## Backfills And Data Fixes

No schema migration framework exists currently; backfills are manual and should be scoped:

- Validate new policy files in non-production first.
- Snapshot the old receipt/event files if they need to be retained before rollout.
- If policy semantics change, rerun representative workloads through `/v1/decide` for behavioral comparison.
- Use bounded rollout and rollback to the previous image/config if receipt interpretation changes unexpectedly.

## Integrity And Consistency

- Receipt IDs and action/input hashes must remain consistent for auditability.
- Receipt reads/writes are append-only (`Save` appends a JSON line and fsyncs).
- On startup, the service loads existing receipts into memory; duplicate IDs are naturally coalesced by key in-memory map.
- Policy validation runs at startup and rejects invalid schemas before serving traffic.

## Sensitive Data Notes

- PII in request text is treated as sensitive and only written in controlled forms:
  - Scans return findings but do not persist raw payloads in receipts.
  - Receipts store action metadata and hashes, not entire request text.
  - Transform outputs should be treated as potentially sensitive when logs are shared externally.
- Receipts/events paths should be writable only to tightly scoped directories/volumes.
- Rotate or archive receipts and events per deployment retention policy.
