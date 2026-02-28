# DataFog

**The data firewall for agents and developer tools.**

DataFog is a runtime **data governance layer** for AI agents and developer tooling.

It runs a single in-process policy loop: **detect → decide → enforce**.
For each payload crossing a process boundary (command execution, file read/write, or API action),
it detects sensitive entities, evaluates policy, and enforces the result before the action proceeds.

This repo has two runtime pieces:

- `datafog-api` – HTTP API for scan/decide/transform/receipts.
- `datafog-shim` – optional runtime policy gate wrapper for CLI-style execution.

The wrapper process is still named `datafog-shim` for compatibility, but we describe its role as a *policy gate*.

## What DataFog does (technical)

1. **Detect** sensitive entities in text and payload context (`/v1/scan`).
2. **Decide** using adapter-aware policy rules (`/v1/decide`) from `policy.json`.
3. **Enforce** the decision before execution (`allow`, `transform`, `allow_with_redaction`, or `deny`) in consuming runtimes.
4. **Transform or tokenize** matched data deterministically when a policy asks for it (`/v1/transform`, `/v1/anonymize`).
5. **Emit an auditable receipt** for every enforcement decision (`/v1/receipts/{id}`).
6. **Optionally emit decision events** (`/v1/events`) when `DATAFOG_EVENTS_PATH` is set.

## What it does not do

- It does not secure every layer of your platform for you.
- It does not continuously discover vulnerabilities.
- It does not manage policy editing UI or dynamic policy updates through the API.
- It does not guarantee zero false positives/negatives from detection (detectors are deterministic and regex/heuristic based).

## Use cases

- Prevent sensitive data from crossing process boundaries before it leaves the machine (for example: a shell command exposing credentials or a script writing secret-bearing files).
- Enforce policy-specific transformations such as masking, tokenization, or redaction at runtime.
- Add pre-execution guardrails to AI agents and CLI workflows.
- Keep auditable receipts/events for every policy decision.

## Positioning

- **Developers and agent builders:** DataFog is a **data-aware policy enforcement layer** for CLI tools and AI agents. It sits in your PATH or runtime, inspects data flowing through commands, and enforces policy before sensitive actions execute.
- **Security/compliance buyers:** DataFog maps closely to runtime DLP for developer workstations, but without the legacy footprint: policy is programmable (OPA-style), decision-aware, and process-bound.
- **Broader view:** DataFog is the **data plane for agent governance** — detect, decide, enforce, and audit.

## Repository layout

- `cmd/datafog-api`: API server.
- `cmd/datafog-shim`: policy-gate wrapper CLI.
- `internal/policy`: policy parsing and matching.
- `internal/scan`: entity detectors.
- `internal/transform`: deterministic redaction/masking/tokenization/anonymization.
- `internal/receipts`: receipt persistence.
- `internal/server`: HTTP handlers and middleware.
- `internal/shim`: decision + execution adapters.
- `config/policy.json`: starter policy used by default.
- `docs/`: API contract and operational docs.

## Prerequisites

- Go **1.22+**
- Optional: Docker (for container workflow)
- Optional: `jq` for pretty-printing JSON

## Quick start (API only)

```sh
go mod download
go run ./cmd/datafog-api
```

The API listens on `:8080` by default and requires a valid policy file at `config/policy.json`.

Verify service is up:

```sh
curl -i http://localhost:8080/health
```

If you set `DATAFOG_API_TOKEN`, send it on every request using:

- `Authorization: Bearer <token>` header, or
- `X-API-Key: <token>` header.

## Configuration

| Variable | Default | Description |
|---|---:|---|
| `DATAFOG_POLICY_PATH` | `config/policy.json` | Policy snapshot loaded at startup |
| `DATAFOG_RECEIPT_PATH` | `datafog_receipts.jsonl` | Append-only receipts file |
| `DATAFOG_EVENTS_PATH` | *(unset)* | NDJSON event log for decision events |
| `DATAFOG_ADDR` | `:8080` | HTTP listen address |
| `DATAFOG_API_TOKEN` | *(unset)* | Optional API auth token |
| `DATAFOG_RATE_LIMIT_RPS` | `0` | Global request cap in RPS (`0` disables) |
| `DATAFOG_READ_TIMEOUT` | `5s` | HTTP read timeout |
| `DATAFOG_WRITE_TIMEOUT` | `10s` | HTTP write timeout |
| `DATAFOG_READ_HEADER_TIMEOUT` | `2s` | Request-header parse timeout |
| `DATAFOG_IDLE_TIMEOUT` | `30s` | Idle keep-alive timeout |
| `DATAFOG_SHUTDOWN_TIMEOUT` | `10s` | Graceful shutdown timeout |
| `GOMAXPROCS` | *(runtime default)* | Auto-tuned at startup to detected CPU limit; set explicitly to override |
| `DATAFOG_PPROF_ADDR` | *(unset)* | If set, starts optional profiling server on this address (example `localhost:6060`) |
| `DATAFOG_FGPROF` | `false` | Add `/debug/fgprof` endpoint to the profiling server |
| `DATAFOG_ENABLE_DEMO` | *(unset)* | Enable `/demo*` endpoints |
| `DATAFOG_DEMO_HTML` | `docs/demo.html` | Path to demo HTML |
| `DATAFOG_ENABLE_ADMIN_UI` | *(unset)* | Enable read-only `GET /admin` |
| `DATAFOG_ADMIN_HTML` | `docs/admin.html` | Path to static admin dashboard HTML |

Duration values use Go duration syntax, for example `1s`, `500ms`, `2m`.

## API surface

Base URL defaults to `http://localhost:8080`.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/health` | Health plus policy identity + start time |
| `GET` | `/v1/policy/version` | Current policy id/version |
| `POST` | `/v1/scan` | Run detector set on text |
| `POST` | `/v1/decide` | Evaluate an action + findings and get a decision |
| `POST` | `/v1/transform` | Apply requested transform mode(s) |
| `POST` | `/v1/anonymize` | Apply irreversible anonymization |
| `GET` | `/v1/receipts` | List recent decision receipts |
| `GET` | `/v1/receipts/{id}` | Read a decision receipt |
| `GET` | `/v1/events` | List recent decision events |
| `GET` | `/admin` | Read-only operational dashboard (requires DATAFOG_ENABLE_ADMIN_UI) |
| `GET` | `/metrics` | In-process metrics counters |

Optional demo routes (only when demo mode is enabled):

- `GET /demo`
- `POST /demo/exec`
- `POST /demo/write-file`
- `POST /demo/read-file`
- `POST /demo/seed`
- `GET /demo/sandbox`

## Optional profiling endpoints

For production debugging, set `DATAFOG_PPROF_ADDR` to run an auxiliary profiling server:

- `/debug/pprof/` (standard net/http/pprof handlers: profiles, goroutines, heap, trace)
- `/debug/fgprof` when `DATAFOG_FGPROF=true` (low-overhead flame graph style profiler)

Recommended values:

- `DATAFOG_PPROF_ADDR=:6060`

The profiling server is disabled by default and should be exposed only on trusted networks.

## Decisions and idempotency

Endpoints that accept `idempotency_key`:

- `/v1/scan`
- `/v1/decide`
- `/v1/transform`
- `/v1/anonymize`

Repeat requests with the same key and identical payload should return the same body and status.
If the same key is reused with a different payload, response is `409` + `idempotency_conflict`.

## Basic examples

### Scan for entities

```sh
curl -X POST http://localhost:8080/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"text":"alice@example.com - API key: SK8x... and 555-123-4567"}'
```

### Decide action

```sh
curl -X POST http://localhost:8080/v1/decide \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "file.write",
      "resource": "notes.txt"
    },
    "text": "customer email is alice@example.com"
  }'
```

### Transform detected sensitive data in text

```sh
curl -X POST http://localhost:8080/v1/transform \
  -H "Content-Type: application/json" \
  -d '{
    "text": "customer email is alice@example.com",
    "findings": [{"entity_type":"email","value":"alice@example.com","start":18,"end":34,"confidence":0.99}],
    "mode":"mask"
  }'
```

### List receipts (admin/read-only)

```sh
curl 'http://localhost:8080/v1/receipts?limit=20&decision=allow'
```

### Fetch a receipt

```sh
curl -s http://localhost:8080/v1/receipts/<receipt-id> | jq .
```

### Query events (optional)

```sh
curl 'http://localhost:8080/v1/events?limit=20&decision=deny'
```

## Enforcement policy gate (`datafog-shim`)

`datafog-shim` is an optional runtime layer for CLI-style workflows.
It sends action details to DataFog (`/v1/decide`) before executing shell/file actions.

Build it:

```sh
go build -o datafog-shim ./cmd/datafog-shim
```

Use direct shell mode:

```sh
./datafog-shim --policy-url http://localhost:8080 shell rm -rf /tmp/test
```

Install a managed wrapper:

```sh
datafog-shim hooks install --target /usr/bin/git git
```

Route wrappers through `PATH`:

```sh
export PATH="$HOME/.datafog/shims:$PATH"
```

Common env vars for the policy gate:

- `DATAFOG_SHIM_POLICY_URL` (required)
- `DATAFOG_SHIM_API_TOKEN` (required if API token is enabled)
- `DATAFOG_SHIM_MODE` (`enforced` or `observe`)
- `DATAFOG_SHIM_EVENT_SINK` (optional NDJSON sink)
- `DATAFOG_SHIM_ENFORCE_POLICY_ERRORS` (`true` to block on policy service errors even in observe mode)

When using `enforced` mode, a blocked action exits non-zero.
In `observe` mode, it logs decisions but allows execution to continue.

Policy gate receipts are logged to `stderr` in a compact format:

```text
receipt=<id> decision=<allow|transform|allow_with_redaction|deny>
```

## Policy file behavior and limits

- Policies live in JSON at `DATAFOG_POLICY_PATH`.
- The policy is loaded on startup only; file edits require restart.
- A restart is the only reload path for policy changes in this version.
- Invalid or malformed JSON blocks startup.

`config/policy.json` in this repo is a runnable example with basic allow/deny/redact behavior.

## Limitations and operational notes

- Detection defaults are fast and deterministic, with bounded coverage.
  - Good for common formats (e.g., email, phone, SSN, API keys, credit cards) and lightweight heuristic NER.
  - Not a full privacy ML detector.
- Receipt log and event log are file-based and must be writable.
- Large volumes of receipts/events need external retention/rotation strategy.
- `/v1/receipts/{id}` and `/v1/events` are read APIs; there is no policy mutate endpoint.

## Container quick start

```sh
docker build -t datafog-api:latest .

docker run --rm -p 8080:8080 \
  -e DATAFOG_API_TOKEN=changeme \
  -e DATAFOG_RATE_LIMIT_RPS=50 \
  -e DATAFOG_RECEIPT_PATH=/var/lib/datafog/datafog_receipts.jsonl \
  -v "$(pwd)/config:/app/config:ro" \
  -v datafog-receipts:/var/lib/datafog \
  datafog-api:latest
```

## Verify setup end-to-end

```sh
# health check
curl -i http://localhost:8080/health

# decision + receipt loop
RECEIPT_ID=$(curl -s -X POST http://localhost:8080/v1/decide \
  -H "Content-Type: application/json" \
  -d '{"action":{"type":"shell.exec","command":"git"},"text":"no pii here"}' \
| jq -r '.receipt_id')

curl -s http://localhost:8080/v1/receipts/$RECEIPT_ID | jq .
```

Expected outcome: the first request returns a decision and receipt id; second call should return the saved receipt.

## Kubernetes deployment example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: datafog-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: datafog-api
  template:
    metadata:
      labels:
        app: datafog-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        runAsGroup: 65532
        fsGroup: 65532
      containers:
      - name: datafog-api
        image: ghcr.io/datafog/datafog-api:v2
        ports:
        - containerPort: 8080
        env:
        - name: DATAFOG_ADDR
          value: ":8080"
        - name: DATAFOG_POLICY_PATH
          value: "/app/config/policy.json"
        - name: DATAFOG_RECEIPT_PATH
          value: "/var/lib/datafog/datafog_receipts.jsonl"
        - name: DATAFOG_EVENTS_PATH
          value: "/var/lib/datafog/datafog_events.ndjson"
        - name: DATAFOG_RATE_LIMIT_RPS
          value: "100"
        - name: DATAFOG_SHUTDOWN_TIMEOUT
          value: "10s"
        volumeMounts:
        - name: policy
          mountPath: /app/config
          readOnly: true
        - name: receipts
          mountPath: /var/lib/datafog
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
      volumes:
      - name: policy
        configMap:
          name: datafog-policy
      - name: receipts
        persistentVolumeClaim:
          claimName: datafog-receipts
```

## Documentation map

- API contract: `docs/contracts/datafog-api-contract.md`
- Architecture/module map: `docs/ARCHITECTURE.md`
- Security and operations:
  - `docs/SECURITY.md`
  - `docs/RELIABILITY.md`
  - `docs/OBSERVABILITY.md`
  - `docs/DOMAIN_DOCS.md`
- Design/product context:
  - `docs/DESIGN.md`
  - `docs/PRODUCT_SENSE.md`

## If something fails, check these first

1. `go test ./...` (build/runtime validation before changing policy)
2. `go test -race ./...` (check race conditions on concurrency-sensitive paths)
3. `/health` response for policy id/version mismatch
4. Environment variables are set and files are writable
5. API token/header if `DATAFOG_API_TOKEN` is configured
6. Policy JSON is valid and rules match expected action fields
7. Optional benchmark sweep: `scripts/run-benchmarks.sh` (writes `/tmp/bench/benchmark-current.txt`; if `scripts/benchmark-baseline.txt` exists, also writes `/tmp/bench/benchmark-trend.txt` with benchstat deltas)
