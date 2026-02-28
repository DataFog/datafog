package shim

import (
	"testing"
	"time"
)

func TestNDJSONDecisionEventSinkWritesAndQueriesAsync(t *testing.T) {
	path := t.TempDir() + "/events.ndjson"
	sink := NewNDJSONDecisionEventSink(path)
	if sink == nil {
		t.Fatalf("expected sink")
	}
	t.Cleanup(func() {
		_ = sink.Close()
	})

	expected := DecisionEvent{
		Timestamp:  time.Now().UTC(),
		Mode:       "observe",
		ActionType: "shell.exec",
		Tool:       "claude",
		Decision:   "allow",
		Allowed:    true,
	}
	sink.Record(expected)

	deadline := time.Now().Add(2 * time.Second)
	var got []DecisionEvent
	for {
		events, err := sink.Query(EventQuery{Limit: 10})
		if err != nil {
			t.Fatalf("query failed: %v", err)
		}
		if len(events) == 1 {
			got = events
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("expected async event to be persisted and queryable, got %d events", len(events))
		}
		time.Sleep(10 * time.Millisecond)
	}
	if got[0].Tool != expected.Tool {
		t.Fatalf("expected tool %q, got %q", expected.Tool, got[0].Tool)
	}
}

func TestNDJSONDecisionEventSinkCloseFlushesPendingEvents(t *testing.T) {
	path := t.TempDir() + "/events.ndjson"
	sink := NewNDJSONDecisionEventSink(path)
	if sink == nil {
		t.Fatalf("expected sink")
	}

	sink.Record(DecisionEvent{Timestamp: time.Now().UTC(), Tool: "vcs", Decision: "deny"})
	sink.Record(DecisionEvent{Timestamp: time.Now().UTC(), Tool: "claude", Decision: "allow"})
	sink.Record(DecisionEvent{Timestamp: time.Now().UTC(), Tool: "editor", Decision: "allow"})

	if err := sink.Close(); err != nil {
		t.Fatalf("close failed: %v", err)
	}

	events, err := sink.Query(EventQuery{Limit: 100})
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("expected 3 events after close, got %d", len(events))
	}

	if err := sink.Close(); err != nil {
		t.Fatalf("idempotent close failed: %v", err)
	}
}
