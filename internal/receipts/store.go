package receipts

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/datafog/datafog-api/internal/models"
	"github.com/datafog/datafog-api/internal/policy"
)

const (
	maxReceiptLineBytes = 1024 * 1024

	defaultReceiptFileMode = 0o600
	defaultReceiptDirMode  = 0o750

	defaultReceiptWriteQueueSize = 1024
	defaultReceiptQueueTimeout   = 5 * time.Second
	defaultReceiptFlushInterval  = 250 * time.Millisecond
	defaultReceiptBatchWrites    = 32
)

type ReceiptStore struct {
	mu            sync.RWMutex
	filePath      string
	receipts      map[string]models.Receipt
	maxEntries    int
	entryCount    int
	writeQueue    chan queuedReceipt
	flushInterval time.Duration
	batchWrites   int
	queueTimeout  time.Duration
	writeDelay    time.Duration
	closed        bool

	closeCh  chan struct{}
	closedCh chan struct{}
	workerWg sync.WaitGroup
	writer   *bufio.Writer
	file     *os.File
}

type queuedReceipt struct {
	receipt models.Receipt
	rotate  bool
}

type ListQuery struct {
	Limit      int
	Decision   string
	ActionType string
	After      *time.Time
	Before     *time.Time
}

var errStoreClosed = errors.New("receipt store is closed")
var errReceiptWriteQueueFull = errors.New("receipt write queue is full")

// MaxEntries sets the maximum number of receipts before rotation.
// 0 means no limit (default).
func MaxEntries(n int) func(*ReceiptStore) {
	return func(s *ReceiptStore) {
		s.maxEntries = n
	}
}

// MaxWriteQueueSize sets the write queue buffer size.
func MaxWriteQueueSize(n int) func(*ReceiptStore) {
	return func(s *ReceiptStore) {
		if n < 0 {
			n = 0
		}
		s.writeQueue = make(chan queuedReceipt, n)
	}
}

// WriteQueueTimeout sets the amount of time Save waits when queue is full before returning.
func WriteQueueTimeout(timeout time.Duration) func(*ReceiptStore) {
	return func(s *ReceiptStore) {
		s.queueTimeout = timeout
	}
}

// WriteDelay introduces an artificial delay before each persisted write.
// It can be used to support deterministically testing backpressure behavior.
func WriteDelay(delay time.Duration) func(*ReceiptStore) {
	return func(s *ReceiptStore) {
		s.writeDelay = delay
	}
}

func NewReceiptStore(filePath string, opts ...func(*ReceiptStore)) (*ReceiptStore, error) {
	if filePath == "" {
		filePath = "datafog_receipts.jsonl"
	}
	filePath = strings.TrimSpace(filePath)
	if strings.ContainsRune(filePath, 0) {
		return nil, fmt.Errorf("invalid receipt path")
	}
	dir := filepath.Dir(filePath)
	if dir != "." {
		if err := os.MkdirAll(dir, defaultReceiptDirMode); err != nil {
			return nil, err
		}
	}

	store := &ReceiptStore{
		filePath:      filePath,
		receipts:      map[string]models.Receipt{},
		flushInterval: defaultReceiptFlushInterval,
		batchWrites:   defaultReceiptBatchWrites,
		queueTimeout:  defaultReceiptQueueTimeout,
		writeQueue:    make(chan queuedReceipt, defaultReceiptWriteQueueSize),
		closeCh:       make(chan struct{}),
		closedCh:      make(chan struct{}),
	}

	for _, opt := range opts {
		opt(store)
	}

	if store.flushInterval <= 0 {
		store.flushInterval = defaultReceiptFlushInterval
	}
	if store.batchWrites <= 0 {
		store.batchWrites = defaultReceiptBatchWrites
	}
	if store.queueTimeout <= 0 {
		store.queueTimeout = defaultReceiptQueueTimeout
	}
	if store.writeQueue == nil {
		store.writeQueue = make(chan queuedReceipt, defaultReceiptWriteQueueSize)
	}
	if store.closeCh == nil {
		store.closeCh = make(chan struct{})
	}
	if store.closedCh == nil {
		store.closedCh = make(chan struct{})
	}

	if err := store.loadExistingReceipts(); err != nil {
		return nil, err
	}

	if err := store.openWriter(); err != nil {
		return nil, err
	}

	store.workerWg.Add(1)
	go store.writeLoop()
	return store, nil
}

func (s *ReceiptStore) NewReceipt(req models.DecideRequest, decision models.Decision, result policy.DecisionResult, policyMeta models.Policy) models.Receipt {
	return models.Receipt{
		ReceiptID:     newID(),
		Timestamp:     time.Now().UTC(),
		RequestID:     req.RequestID,
		TraceID:       req.TraceID,
		TenantID:      req.TenantID,
		ActorID:       req.ActorID,
		SessionID:     req.SessionID,
		PolicyVersion: policyMeta.PolicyVersion,
		PolicyID:      policyMeta.PolicyID,
		Decision:      decision,
		Action:        req.Action,
		MatchedRules:  result.MatchedRules,
		Findings:      req.Findings,
		TransformPlan: result.TransformPlan,
		Reason:        result.Reason,
	}
}

func (s *ReceiptStore) Save(receipt models.Receipt) (models.Receipt, error) {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return receipt, errStoreClosed
	}
	if receipt.ReceiptID == "" {
		receipt.ReceiptID = newID()
	}

	rotate := false
	if s.maxEntries > 0 && s.entryCount >= s.maxEntries {
		s.receipts = map[string]models.Receipt{}
		s.entryCount = 0
		rotate = true
	}

	s.receipts[receipt.ReceiptID] = receipt
	s.entryCount++
	s.mu.Unlock()

	writeTask := queuedReceipt{receipt: receipt, rotate: rotate}
	select {
	case s.writeQueue <- writeTask:
		return receipt, nil
	case <-s.closeCh:
		return receipt, errStoreClosed
	case <-time.After(s.queueTimeout):
		return receipt, errReceiptWriteQueueFull
	}
}

func (s *ReceiptStore) Close() error {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		<-s.closedCh
		return nil
	}
	s.closed = true
	close(s.closeCh)
	s.mu.Unlock()

	s.workerWg.Wait()
	<-s.closedCh
	return nil
}

// rotateAndOpen archives the current receipts file and starts fresh.
func (s *ReceiptStore) rotateAndOpen() error {
	if err := s.flushWriter(); err != nil {
		return err
	}
	if err := s.closeWriter(); err != nil {
		return err
	}

	archivePath := s.filePath + "." + time.Now().UTC().Format("20060102T150405Z")
	if err := os.Rename(s.filePath, archivePath); err != nil && !os.IsNotExist(err) {
		return err
	}

	return s.openWriter()
}

func (s *ReceiptStore) writeLoop() {
	defer s.workerWg.Done()
	defer close(s.closedCh)

	ticker := time.NewTicker(s.flushInterval)
	defer ticker.Stop()

	pendingWrites := 0
	for {
		select {
		case <-ticker.C:
			if pendingWrites > 0 {
				_ = s.flushWriter()
				pendingWrites = 0
			}
		case writeTask := <-s.writeQueue:
			if err := s.applyWriteTask(writeTask); err != nil {
				// Drop task-specific persistence errors for now; in-memory state remains.
				// Callers can observe filesystem health by checking write throughput externally.
			}
			pendingWrites++
			if pendingWrites >= s.batchWrites {
				_ = s.flushWriter()
				pendingWrites = 0
			}
		case <-s.closeCh:
			for {
				select {
				case writeTask := <-s.writeQueue:
					if err := s.applyWriteTask(writeTask); err != nil {
					}
					pendingWrites++
				default:
					goto drained
				}
			}
		drained:
			if pendingWrites > 0 {
				_ = s.flushWriter()
			}
			_ = s.closeWriter()
			return
		}
	}
}

func (s *ReceiptStore) applyWriteTask(writeTask queuedReceipt) error {
	if writeTask.rotate {
		if err := s.rotateAndOpen(); err != nil {
			return err
		}
	}

	if s.writeDelay > 0 {
		time.Sleep(s.writeDelay)
	}

	payload, err := json.Marshal(writeTask.receipt)
	if err != nil {
		return err
	}

	next := appendWithLine(payload)
	_, err = s.writer.Write(next)
	return err
}

func (s *ReceiptStore) flushWriter() error {
	if s.writer == nil || s.file == nil {
		return nil
	}
	if err := s.writer.Flush(); err != nil {
		return err
	}
	return s.file.Sync()
}

func (s *ReceiptStore) openWriter() error {
	file, err := os.OpenFile(s.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, defaultReceiptFileMode) // #nosec G304 -- receipt path is validated from startup configuration.
	if err != nil {
		return err
	}

	s.file = file
	s.writer = bufio.NewWriter(file)
	return nil
}

func (s *ReceiptStore) closeWriter() error {
	if s.writer != nil {
		if err := s.writer.Flush(); err != nil {
			return err
		}
		s.writer = nil
	}
	if s.file != nil {
		if err := s.file.Close(); err != nil {
			s.file = nil
			return err
		}
		s.file = nil
	}
	return nil
}

// Count returns the number of receipts in memory.
func (s *ReceiptStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.receipts)
}

// List returns receipts sorted newest-first and optional filters.
func (s *ReceiptStore) List(q ListQuery) ([]models.Receipt, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	limit := q.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	results := make([]models.Receipt, 0, len(s.receipts))
	for _, receipt := range s.receipts {
		if q.Decision != "" && !strings.EqualFold(string(receipt.Decision), q.Decision) {
			continue
		}
		if q.ActionType != "" && !strings.EqualFold(receipt.Action.Type, q.ActionType) {
			continue
		}
		if q.After != nil && !receipt.Timestamp.After(*q.After) {
			continue
		}
		if q.Before != nil && !receipt.Timestamp.Before(*q.Before) {
			continue
		}
		results = append(results, receipt)
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].Timestamp.Equal(results[j].Timestamp) {
			return results[i].ReceiptID < results[j].ReceiptID
		}
		return results[i].Timestamp.After(results[j].Timestamp)
	})

	total := len(results)
	if len(results) > limit {
		results = results[:limit]
	}
	return results, total
}

func (s *ReceiptStore) loadExistingReceipts() error {
	f, err := os.OpenFile(s.filePath, os.O_RDONLY, defaultReceiptFileMode) // #nosec G304 -- receipt path is validated from startup configuration.
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), maxReceiptLineBytes)

	badLines := 0
	s.mu.Lock()
	defer s.mu.Unlock()
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var receipt models.Receipt
		if err := json.Unmarshal([]byte(line), &receipt); err != nil {
			badLines++
			continue
		}
		s.receipts[receipt.ReceiptID] = receipt
		s.entryCount++
	}
	if err := scanner.Err(); err != nil {
		return err
	}

	if badLines > 0 && len(s.receipts) == 0 {
		return fmt.Errorf("decode existing receipt: no valid receipt records found in %s (bad lines: %d)", s.filePath, badLines)
	}
	return nil
}

func appendWithLine(data []byte) []byte {
	return append(append(make([]byte, 0, len(data)+1), data...), '\n')
}

func (s *ReceiptStore) Get(id string) (models.Receipt, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.receipts[id]
	return r, ok
}

func newID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}
