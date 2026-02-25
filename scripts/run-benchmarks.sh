#!/usr/bin/env bash

set -euo pipefail

echo "Running API hot-path benchmark suite..."

go test -run '^$' -bench 'BenchmarkScanText|BenchmarkPolicyEvaluate|BenchmarkDecideEndpoint|BenchmarkScanEndpoint' -benchmem ./internal/scan ./internal/policy ./internal/server | tee /tmp/benchmark-results.txt

echo "Benchmark output written to /tmp/benchmark-results.txt"