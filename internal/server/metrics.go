package server

import (
	"fmt"
	"hash/fnv"
	"sync"
	"sync/atomic"
	"time"
)

const metricShardCount = 16

type metricCounterMap struct {
	shards [metricShardCount]metricCounterShard
}

type metricCounterShard struct {
	mu       sync.RWMutex
	counters map[string]*atomic.Int64
}

func newMetricCounterMap() *metricCounterMap {
	m := &metricCounterMap{}
	for i := 0; i < metricShardCount; i++ {
		m.shards[i].counters = make(map[string]*atomic.Int64)
	}
	return m
}

func (m *metricCounterMap) add(key string, delta int64) {
	sh := m.shard(key)
	counter := sh.loadCounter(key)
	if counter == nil {
		counter = sh.initCounter(key)
	}
	counter.Add(delta)
}

func (m *metricCounterMap) load(key string) int64 {
	sh := m.shard(key)
	sh.mu.RLock()
	counter := sh.counters[key]
	sh.mu.RUnlock()
	if counter == nil {
		return 0
	}
	return counter.Load()
}

func (m *metricCounterMap) snapshot() map[string]int64 {
	out := make(map[string]int64)
	for i := 0; i < metricShardCount; i++ {
		sh := &m.shards[i]
		sh.mu.RLock()
		for key, counter := range sh.counters {
			out[key] = counter.Load()
		}
		sh.mu.RUnlock()
	}
	return out
}

func (m *metricCounterMap) shard(key string) *metricCounterShard {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return &m.shards[h.Sum32()%metricShardCount]
}

func (s *metricCounterShard) loadCounter(key string) *atomic.Int64 {
	s.mu.RLock()
	counter := s.counters[key]
	s.mu.RUnlock()
	return counter
}

func (s *metricCounterShard) initCounter(key string) *atomic.Int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	if existing := s.counters[key]; existing != nil {
		return existing
	}
	counter := &atomic.Int64{}
	s.counters[key] = counter
	return counter
}

func (s *metricCounterMap) len() int {
	count := 0
	for i := 0; i < metricShardCount; i++ {
		sh := &s.shards[i]
		sh.mu.RLock()
		count += len(sh.counters)
		sh.mu.RUnlock()
	}
	return count
}

func intKey(value int) string {
	return fmt.Sprintf("%d", value)
}

type requestMetrics struct {
	totalCount      atomic.Int64
	errorCount      atomic.Int64
	totalLatencyNs  atomic.Int64
	pathHits        *metricCounterMap
	methodHits      *metricCounterMap
	statusHits      *metricCounterMap
	pathLatencyNs   *metricCounterMap
	pathLatencyHits *metricCounterMap
}

func newRequestMetrics() *requestMetrics {
	return &requestMetrics{
		pathHits:        newMetricCounterMap(),
		methodHits:      newMetricCounterMap(),
		statusHits:      newMetricCounterMap(),
		pathLatencyNs:   newMetricCounterMap(),
		pathLatencyHits: newMetricCounterMap(),
	}
}

func (m *requestMetrics) record(method string, route string, status int, latencyNs int64) {
	m.totalCount.Add(1)
	m.totalLatencyNs.Add(latencyNs)
	if status >= 400 {
		m.errorCount.Add(1)
	}
	m.methodHits.add(method, 1)
	m.pathHits.add(route, 1)
	m.statusHits.add(intKey(status), 1)
	m.pathLatencyNs.add(route, latencyNs)
	m.pathLatencyHits.add(route, 1)
}

func (m *requestMetrics) snapshot() (total int64, errorCount int64, avgLatencyMs float64, byMethod, byPath, byStatus map[string]int64, byPathLatency map[string]float64) {
	count := m.totalCount.Load()
	errorCount = m.errorCount.Load()
	latencyNs := m.totalLatencyNs.Load()
	if count > 0 {
		avgLatencyMs = float64(latencyNs) / float64(count) / float64(1e6)
		if avgLatencyMs <= 0 {
			avgLatencyMs = float64(time.Nanosecond) / float64(time.Millisecond)
		}
	}

	byMethod = m.methodHits.snapshot()
	byPath = m.pathHits.snapshot()
	byStatus = m.statusHits.snapshot()

	pathNs := m.pathLatencyNs.snapshot()
	pathHits := m.pathLatencyHits.snapshot()
	byPathLatency = make(map[string]float64)
	for path, ns := range pathNs {
		hits := pathHits[path]
		if hits == 0 {
			continue
		}
		v := float64(ns) / float64(hits) / float64(1e6)
		if v <= 0 {
			v = float64(time.Nanosecond) / float64(time.Millisecond)
		}
		byPathLatency[path] = v
	}
	return count, errorCount, avgLatencyMs, byMethod, byPath, byStatus, byPathLatency
}
