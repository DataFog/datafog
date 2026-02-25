# Core Beliefs

These beliefs guide roadmap and implementation decisions for DataFog.

## Belief 1: Default to Safe Deny

- **Statement:** If policy is missing, ambiguous, or malformed, the system should fail closed.
- **Why it matters:** Privacy controls must not provide a false sense of safety through accidental permissive behavior.
- **Tradeoffs:** This can produce more friction for first-time users, but improves safety during policy rollout and migration.

## Belief 2: Determinism Is a Security Control

- **Statement:** The same input and policy snapshot must produce identical decisions and artifacts every time.
- **Why it matters:** Deterministic outcomes make policy testing, incident response, and audit easier.
- **Tradeoffs:** Some advanced heuristic techniques can be less predictable; those are only used when wrapped in explicit policy outcomes.

## Belief 3: Auditable by Default

- **Statement:** Enforcement without trail is incomplete enforcement.
- **Why it matters:** Operators and auditors need `receipt_id`, matched rules, and evidence signals to validate behavior under pressure.
- **Tradeoffs:** Persistence adds storage and lifecycle overhead, but it is essential for trust and recovery.
