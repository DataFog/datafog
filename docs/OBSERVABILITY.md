---
title: "Observability"
use_when: "Documenting logging, metrics, tracing, and health check conventions for this repo, including how agents can access signals to verify behavior."
---

## Logging Strategy

DataFog logs request lifecycle events to stdout/stderr with request IDs.

- Every completed API request logs `request_id`, method, path, status, and latency.
- Panics are recovered and logged as 500 errors.
- Receipt/event helper messages are logged to stderr (`decision=...`, `receipt=...`) by the policy gate and written to file sinks when configured.
- Never emit raw request secrets or credentials in logs.

## Metrics

In-process counters are exposed at `GET /metrics`:

- `total_requests`
- `error_requests`
- `by_status`
- `by_path`
- `by_method`
- `avg_latency_ms`
- `by_path_avg_latency_ms`
- `uptime_seconds`
- `started_at`

Use:

```sh
curl -s http://localhost:8080/metrics | jq .
```

This can be scraped by Prometheus-compatible tooling or sampled by scripts for local checks.

## Profiling

Optional runtime profiling is available when `DATAFOG_PPROF_ADDR` is set:

- standard pprof at `/debug/pprof/`
- fgprof flamegraph endpoint at `/debug/fgprof` when `DATAFOG_FGPROF=true`

```sh
curl -s http://localhost:6060/debug/pprof/heap?debug=1 | head
```

Keep profiling endpoints off public networks unless authenticated or otherwise isolated.

## Traces

Distributed tracing is not yet implemented in this repository. If you add tracing, preserve the request correlation fields (`x-request-id` / `X-Request-ID`) as the minimum boundary signal.

## Health Checks

- `GET /health` returns `200` with policy identity and startup timestamp when service is ready.
- Failures show non-200 and error payloads without panicking side effects.

Use:

```sh
curl -i http://localhost:8080/health
```

## Event and decision introspection

- Configure `DATAFOG_EVENTS_PATH` to emit NDJSON decision events.
- Query events through `GET /v1/events` with optional filters:

```sh
curl 'http://localhost:8080/v1/events?limit=20&decision=deny'
curl 'http://localhost:8080/v1/events?adapter=claude&after=2026-02-24T00:00:00Z'
```

## Agent Access

- Start by checking `/health` and `/metrics` after boot.
- Reproduce a request and inspect the returned `receipt_id`.
- Pull the immutable receipt: `GET /v1/receipts/{id}`.
- Confirm enforcement events with optional filtering from `/v1/events`.
