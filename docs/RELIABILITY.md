---
title: "Reliability"
use_when: "Capturing reliability goals, failure modes, monitoring, and operational guardrails for this repo."
---

## Reliability goals (MVP)

- Core API availability: target `99.9%` service availability.
- Primary decision path (`POST /v1/decide`) latency should remain low and stable under sustained load.
- `/health` should remain fast and dependable for liveness/readiness checks.

Definition of degraded (for operational alerts):

- Endpoint errors above normal baseline for 5+ minute windows.
- Repeated `429` bursts with no clear client-side remediation.
- Sustained startup failures or repeated process restarts.

## Failure Modes

Top failures and controls:

- **Invalid/missing policy file:**
  - Signal: startup failure (process exits), `not found`/schema logs.
  - Blast radius: full API path fails to start.
  - Recovery: fix policy JSON, validate `policy_id`/`policy_version`, and restart.

- **Receipt persistence failure:**
  - Signal: `/v1/decide` returns internal errors, repeated `receipt_error`.
  - Blast radius: policy enforcement decisions may degrade as persistence is required.
  - Recovery: verify `DATAFOG_RECEIPT_PATH` permissions and disk health, or relocate path.

- **Rate limit misconfiguration:**
  - Signal: sudden `429` rise (`rate_limited`).
  - Blast radius: throttling of legitimate traffic.
  - Recovery: tune `DATAFOG_RATE_LIMIT_RPS` per environment profile.

- **Shutdown behavior:**
  - Signal: long process termination, orphaned requests.
  - Recovery: respect `DATAFOG_SHUTDOWN_TIMEOUT`; verify SIGTERM/SIGINT handling in runbook.

## Monitoring

Minimum signal set (all from first-party endpoints):

- Error rate by endpoint/path/status from `/metrics`.
- Request volume and traffic mix from `/metrics`.
- `GET /health` response time and status for readiness/liveness.
- Receipt file write errors in logs.

Alerting should focus on:

- sustained error-rate increases with low traffic baselines,
- process restart loops,
- blocked authentication spikes (`401`),
- persistent write failures or full disks on receipt/event paths.

## Operational Guardrails

- Keep config explicit and versioned (`policy.json`, deployment manifests, env settings).
- Deploy policy changes through normal rollout controls (staging + canary when possible).
- Rotate credentials and tokens on incidents.
- Document rollback path before enabling policy or enforcement changes in production.
