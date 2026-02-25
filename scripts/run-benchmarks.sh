#!/usr/bin/env bash

set -euo pipefail

BENCH_PATTERN='BenchmarkScanText|BenchmarkPolicyEvaluate|BenchmarkDecideEndpoint|BenchmarkScanEndpoint'
OUTPUT_DIR="${DATAFOG_BENCH_OUTPUT_DIR:-/tmp/bench}"
CURRENT_FILE="${DATAFOG_BENCH_CURRENT_FILE:-$OUTPUT_DIR/benchmark-current.txt}"
TREND_FILE="${DATAFOG_BENCH_TREND_FILE:-$OUTPUT_DIR/benchmark-trend.txt}"
BASELINE_FILE="${DATAFOG_BENCH_BASELINE_FILE:-$(pwd)/scripts/benchmark-baseline.txt}"

mkdir -p "$OUTPUT_DIR"

echo "Running API hot-path benchmark suite..."
go test -run '^$' -bench "$BENCH_PATTERN" -benchmem ./internal/scan ./internal/policy ./internal/server | tee "$CURRENT_FILE"

echo "Benchmark output written to $CURRENT_FILE"

if [ -f "$BASELINE_FILE" ]; then
  echo "Comparing against baseline: $BASELINE_FILE"

  BENCHSTAT_BIN=""
  if command -v benchstat >/dev/null 2>&1; then
    BENCHSTAT_BIN="$(command -v benchstat)"
  else
    if ! go install golang.org/x/perf/cmd/benchstat@latest >/dev/null; then
      echo "warn: unable to install benchstat; skipping trend report"
      exit 0
    fi

    GO_BIN="$(go env GOPATH)/bin/benchstat"
    if [ -x "$GO_BIN" ]; then
      BENCHSTAT_BIN="$GO_BIN"
    else
      echo "warn: benchstat not available after installation; skipping trend report"
      exit 0
    fi
  fi

  "$BENCHSTAT_BIN" "$BASELINE_FILE" "$CURRENT_FILE" | tee "$TREND_FILE"
  echo "Trend report written to $TREND_FILE"
else
  echo "No baseline found at $BASELINE_FILE, skipping trend comparison"
fi
