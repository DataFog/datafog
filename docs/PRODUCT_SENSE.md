---
title: "Product Sense"
use_when: "Capturing target users, success outcomes, decision heuristics, and quality criteria for this repo."
---

## Target Users

- **Primary:** platform and security teams that need deterministic enforcement for AI agents and developer tooling.
- **Secondary:** developers integrating DataFog with local or remote CLIs (Claude, Codex, custom adapters), and SREs operating privacy controls in CI/CD environments.
- **Non-users:** teams seeking full SIEM/data lake analytics platform functionality; this repo is a policy and enforcement core, not a complete security platform.

## Key Outcomes

- **Trustworthy decisions:** deterministic policy outcomes for the same input/context.
- **Safe execution paths:** easy deployment path for command/file protection without hand-authored wrappers.
- **Auditable behavior:** every protected decision is traceable via receipt IDs, matched rules, and optional event logs.
- **Operator confidence:** clear status, error, and failure semantics so teams can operate under change.

## Decision Heuristics

- Default to least-privilege: if policy/rule ambiguity exists, deny first.
- Prefer policy updates over code changes when behavior can be expressed declaratively in `policy.json`.
- Add behavior behind explicit CLI flags and env vars (`--observe`, `DATAFOG_SHIM_MODE`) rather than global defaults.
- Keep transform plans explicit and logged; avoid silent redactions.

## Quality Criteria

- Clear errors with machine-readable `code` + human-readable `message`.
- Deterministic behavior for repeated requests under unchanged policy.
- Readable policy artifacts (`policy.json`, receipts) and easy rollback points.
- No silent mutation paths: all meaningful decisions should be traceable by `receipt_id` or events.
