package receipts

import (
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/datafog/datafog-api/internal/models"
	"github.com/datafog/datafog-api/internal/policy"
)

func TestReceiptStoreSaveAndGet(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	req := models.DecideRequest{RequestID: "r1", Action: models.ActionMeta{Type: "file.read", Resource: "x"}}
	result := policy.DecisionResult{Decision: models.DecisionAllow, MatchedRules: []string{"allow-1"}}
	policyMeta := models.Policy{PolicyID: "m", PolicyVersion: "v1"}
	receipt := store.NewReceipt(req, models.DecisionAllow, result, policyMeta)
	saved, err := store.Save(receipt)
	if err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if saved.ReceiptID == "" {
		t.Fatalf("receipt id empty")
	}
	got, ok := store.Get(saved.ReceiptID)
	if !ok {
		t.Fatalf("receipt not found")
	}
	if got.Decision != models.DecisionAllow {
		t.Fatalf("expected allow receipt")
	}

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("receipt file missing: %v", err)
	}
}

func TestReceiptStoreLoadsExistingReceipts(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	existing := models.Receipt{
		ReceiptID:     "receipt-seeded",
		PolicyID:      "policy-1",
		PolicyVersion: "v1",
		RequestID:     "r1",
		Decision:      models.DecisionDeny,
		MatchedRules:  []string{"seed"},
	}
	data, err := json.Marshal(existing)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
		t.Fatalf("seed file write failed: %v", err)
	}

	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})
	got, ok := store.Get("receipt-seeded")
	if !ok {
		t.Fatalf("expected to load existing receipt")
	}
	if got.Decision != models.DecisionDeny {
		t.Fatalf("unexpected decision: %s", got.Decision)
	}
}

func TestReceiptStoreSkipsCorruptReceiptLines(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	good := models.Receipt{
		ReceiptID:     "receipt-good",
		PolicyID:      "policy-1",
		PolicyVersion: "v1",
		Decision:      models.DecisionAllow,
	}
	data, err := json.Marshal(good)
	if err != nil {
		t.Fatalf("marshal good receipt failed: %v", err)
	}
	if err := os.WriteFile(path, append([]byte("{\n"), append(data, '\n')...), 0o644); err != nil {
		t.Fatalf("seed file write failed: %v", err)
	}

	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("expected corrupt+good receipts to load, got %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})
	if got, ok := store.Get("receipt-good"); !ok {
		t.Fatalf("expected good receipt loaded")
	} else if got.ReceiptID != "receipt-good" {
		t.Fatalf("expected loaded receipt id, got %q", got.ReceiptID)
	}
}

func TestReceiptStoreRejectsCorruptReceiptLine(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	if err := os.WriteFile(path, []byte("{\n"), 0o644); err != nil {
		t.Fatalf("seed file write failed: %v", err)
	}

	if _, err := NewReceiptStore(path); err == nil {
		t.Fatalf("expected receipt load failure on corrupt line")
	}
}

func TestReceiptStoreLoadsLargeReceiptLine(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	existing := models.Receipt{
		ReceiptID: "receipt-large",
		PolicyID:  "policy-1",
		Findings: []models.ScanFinding{
			{
				EntityType: "email",
				Value:      strings.Repeat("x", 600*1024),
				Start:      0,
				End:        600 * 1024,
				Confidence: 0.9,
			},
		},
		PolicyVersion: "v1",
		RequestID:     "r1",
		Decision:      models.DecisionAllow,
		MatchedRules:  []string{"seed"},
	}
	data, err := json.Marshal(existing)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
		t.Fatalf("seed file write failed: %v", err)
	}

	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})
	got, ok := store.Get("receipt-large")
	if !ok {
		t.Fatalf("expected to load large receipt")
	}
	if got.ReceiptID != "receipt-large" {
		t.Fatalf("expected loaded receipt id receipt-large, got %q", got.ReceiptID)
	}
}

func TestReceiptStoreSaveQueueSaturationReturnsBackpressure(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"

	store, err := NewReceiptStore(
		path,
		MaxWriteQueueSize(0),
		WriteQueueTimeout(5*time.Millisecond),
		WriteDelay(20*time.Millisecond),
	)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	if _, err := store.Save(models.Receipt{ReceiptID: "full-1"}); err != nil {
		t.Fatalf("expected first save to enqueue, got %v", err)
	}
	if _, err := store.Save(models.Receipt{ReceiptID: "full-2"}); !errors.Is(err, errReceiptWriteQueueFull) {
		t.Fatalf("expected queue saturation error, got %v", err)
	}
	if got, ok := store.Get("full-1"); !ok || got.ReceiptID != "full-1" {
		t.Fatalf("expected first receipt to remain in-memory, got ok=%v id=%q", ok, got.ReceiptID)
	}
	if got, ok := store.Get("full-2"); !ok || got.ReceiptID != "full-2" {
		t.Fatalf("expected second receipt to remain in-memory despite write backpressure, got ok=%v id=%q", ok, got.ReceiptID)
	}
}

func TestReceiptStoreListFiltersAndLimit(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	base := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	if _, err := store.Save(models.Receipt{ReceiptID: "a-old", Decision: models.DecisionAllow, Action: models.ActionMeta{Type: "file.write"}, Timestamp: base.Add(-2 * time.Hour)}); err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if _, err := store.Save(models.Receipt{ReceiptID: "b-middle", Decision: models.DecisionAllow, Action: models.ActionMeta{Type: "shell.exec"}, Timestamp: base.Add(-time.Minute)}); err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if _, err := store.Save(models.Receipt{ReceiptID: "c-new", Decision: models.DecisionDeny, Action: models.ActionMeta{Type: "file.write"}, Timestamp: base}); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	entries, total := store.List(ListQuery{Limit: 2, Decision: "allow"})
	if total != 2 {
		t.Fatalf("expected 2 total allow matches, got %d", total)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 returned entries with default limit 2, got %d", len(entries))
	}
	if entries[0].ReceiptID != "b-middle" || entries[1].ReceiptID != "a-old" {
		t.Fatalf("expected ordered newest-to-oldest allow receipts, got %s, %s", entries[0].ReceiptID, entries[1].ReceiptID)
	}

	limitedEntries, limitedTotal := store.List(ListQuery{Decision: "allow", Limit: 1})
	if limitedTotal != 2 {
		t.Fatalf("expected 2 total allow matches for limited query, got %d", limitedTotal)
	}
	if len(limitedEntries) != 1 {
		t.Fatalf("expected 1 returned entry with limit 1, got %d", len(limitedEntries))
	}
	if limitedEntries[0].ReceiptID != "b-middle" {
		t.Fatalf("expected newest allow receipt first, got %s", limitedEntries[0].ReceiptID)
	}

	before := base
	actionEntries, total := store.List(ListQuery{ActionType: "file.write", Before: &before, Limit: 10})
	if total != 1 {
		t.Fatalf("expected 1 file.write receipt before %s, got %d", before, total)
	}
	if len(actionEntries) != 1 {
		t.Fatalf("expected 1 returned entry, got %d", len(actionEntries))
	}
}

func TestReceiptStoreCloseDrainsQueuedWrites(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}

	receipts := []models.Receipt{
		{ReceiptID: "flush-1", Decision: models.DecisionAllow},
		{ReceiptID: "flush-2", Decision: models.DecisionAllow},
		{ReceiptID: "flush-3", Decision: models.DecisionAllow},
	}

	for i, receipt := range receipts {
		if _, err := store.Save(receipt); err != nil {
			t.Fatalf("save %d failed: %v", i, err)
		}
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close failed: %v", err)
	}

	reopened, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("reopen after close failed: %v", err)
	}
	t.Cleanup(func() {
		_ = reopened.Close()
	})

	for _, id := range []string{"flush-1", "flush-2", "flush-3"} {
		if _, ok := reopened.Get(id); !ok {
			t.Fatalf("expected receipt %q to be flushed to disk and reloaded", id)
		}
	}
}

func TestReceiptStoreSaveAfterCloseReturnsError(t *testing.T) {
	path := t.TempDir() + "/receipts.jsonl"
	store, err := NewReceiptStore(path)
	if err != nil {
		t.Fatalf("new store failed: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close failed: %v", err)
	}
	if _, err := store.Save(models.Receipt{ReceiptID: "closed"}); !errors.Is(err, errStoreClosed) {
		t.Fatalf("expected closed store error, got %v", err)
	}
}
