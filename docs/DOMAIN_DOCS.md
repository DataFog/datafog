# Domain Docs Registry

Reference for agents: what domain docs exist, how to detect relevant content, and when to update each file. Keep this map aligned with actual repository content.

## Domain Docs

| Doc | Path | Purpose | Auto-Detect Signals | Last Updated |
|---|---|---|---|---|
| DESIGN.md | `docs/DESIGN.md` | Engineering and API design principles | Policy-driven behavior, enforcement controls, API request/response consistency | 2026-02-24 |
| DATA.md | `docs/DATA.md` | Data model and data-change safety (policy, receipts, events) | `policy.json`, receipt/event files, persistence paths | 2026-02-24 |
| FRONTEND.md | `docs/FRONTEND.md` | Frontend conventions and optional demo surfaces | `docs/demo.html`, `internal/server/demo.go`, demo routes | 2026-02-24 |
| PRODUCT_SENSE.md | `docs/PRODUCT_SENSE.md` | Target users, outcomes, and quality criteria | Requests for new behavior or scope changes | 2026-02-24 |
| RELIABILITY.md | `docs/RELIABILITY.md` | Reliability targets, failure modes, guardrails | Health endpoints, env timeout config, graceful shutdown paths | 2026-02-24 |
| SECURITY.md | `docs/SECURITY.md` | Threat model and runtime controls | API token usage, secret handling, container hardening | 2026-02-24 |
| OBSERVABILITY.md | `docs/OBSERVABILITY.md` | Logs, metrics, and operations access | `/metrics`, `/health`, `/v1/events`, logging output | 2026-02-24 |
| core-beliefs.md | `docs/design-docs/core-beliefs.md` | Core engineering and product beliefs | Roadmap and implementation tradeoffs | 2026-02-24 |

## When to Create or Update

- **he-plan:** populate or refresh domain docs during planning handoff when scope requires.
- **he-implement:** update docs when behavior, storage, or observability changes.
- **he-learn:** add outcomes and lessons after major releases.
- **he-doc-gardening:** keep stale domain docs current if templates remain in placeholder form.

## How to Create or Update

1. Confirm whether the file exists and is currently still template-level guidance.
2. Replace placeholders with repo-specific behavior, or append concrete sections.
3. Keep the structure stable where useful and add concrete evidence references (paths, commands, defaults).
4. When behavior changes, update both this registry and the owning doc in the same commit.
