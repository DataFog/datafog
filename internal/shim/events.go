package shim

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type DecisionEvent struct {
	Timestamp  time.Time `json:"timestamp"`
	Mode       string    `json:"mode"`
	ActionType string    `json:"action_type"`
	Tool       string    `json:"tool"`
	Resource   string    `json:"resource"`
	Command    string    `json:"command"`
	Args       []string  `json:"args"`
	Sensitive  bool      `json:"sensitive"`
	Decision   string    `json:"decision"`
	Allowed    bool      `json:"allowed"`
	ReceiptID  string    `json:"receipt_id,omitempty"`
	Matched    []string  `json:"matched_rules,omitempty"`
	Reason     string    `json:"reason,omitempty"`
	CheckError string    `json:"check_error,omitempty"`
	RequestID  string    `json:"request_id,omitempty"`
	TraceID    string    `json:"trace_id,omitempty"`
}

type DecisionEventSink interface {
	Record(event DecisionEvent)
}

// EventQuery allows filtering events by time range, decision type, and adapter.
type EventQuery struct {
	After    *time.Time
	Before   *time.Time
	Decision string
	Adapter  string
	Limit    int
}

// EventReader reads stored events with optional filtering.
type EventReader interface {
	Query(q EventQuery) ([]DecisionEvent, error)
}

type noopEventSink struct{}

func (s noopEventSink) Record(_ DecisionEvent) {}

type NDJSONDecisionEventSink struct {
	path         string
	writes       chan DecisionEvent
	closed       chan struct{}
	closeOnce    sync.Once
	writer       *bufio.Writer
	file         *os.File
	flushTimeout time.Duration
	mu           sync.RWMutex
	isClosed     bool
	writeMu      sync.Mutex
}

func NewNDJSONDecisionEventSink(path string) *NDJSONDecisionEventSink {
	sink := &NDJSONDecisionEventSink{
		path:         path,
		writes:       make(chan DecisionEvent, 512),
		closed:       make(chan struct{}),
		flushTimeout: 500 * time.Millisecond,
	}
	if path == "" {
		return sink
	}
	if err := sink.openWriter(); err != nil {
		// Will keep trying when events arrive.
	}
	go sink.loop()
	return sink
}

func (s *NDJSONDecisionEventSink) Close() error {
	if s == nil || s.path == "" {
		return nil
	}

	s.closeOnce.Do(func() {
		s.mu.Lock()
		s.isClosed = true
		s.mu.Unlock()

		close(s.writes)
		<-s.closed
	})
	return nil
}

func (s *NDJSONDecisionEventSink) openWriter() error {
	if s.path == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0o750); err != nil {
		return err
	}

	file, err := os.OpenFile(s.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	s.file = file
	s.writer = bufio.NewWriter(file)
	return nil
}

func (s *NDJSONDecisionEventSink) closeWriter() error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
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

func (s *NDJSONDecisionEventSink) flushWriter() error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	if s.writer == nil {
		return nil
	}
	if err := s.writer.Flush(); err != nil {
		return err
	}
	return s.file.Sync()
}

func (s *NDJSONDecisionEventSink) loop() {
	defer close(s.closed)
	defer func() {
		_ = s.closeWriter()
	}()

	ticker := time.NewTicker(s.flushTimeout)
	defer ticker.Stop()

	for {
		select {
		case event, ok := <-s.writes:
			if !ok {
				_ = s.flushWriter()
				return
			}
			s.writeMu.Lock()
			if s.writer == nil {
				if err := s.openWriter(); err != nil {
					s.writeMu.Unlock()
					continue
				}
			}
			payload, err := json.Marshal(event)
			if err != nil {
				s.writeMu.Unlock()
				continue
			}
			_, _ = s.writer.Write(append(payload, '\n'))
			s.writeMu.Unlock()
		case <-ticker.C:
			_ = s.flushWriter()
		}
	}
}

func (s *NDJSONDecisionEventSink) Record(event DecisionEvent) {
	if s == nil || s.path == "" {
		return
	}

	s.mu.RLock()
	closed := s.isClosed
	s.mu.RUnlock()
	if closed {
		return
	}

	select {
	case s.writes <- event:
	default:
		// Drop events when the buffer is full.
	}
}

// Query reads events from the NDJSON file and applies filters.
func (s *NDJSONDecisionEventSink) Query(q EventQuery) ([]DecisionEvent, error) {
	if s == nil || s.path == "" {
		return nil, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	f, err := os.Open(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()

	var events []DecisionEvent
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var event DecisionEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}

		if q.After != nil && event.Timestamp.Before(*q.After) {
			continue
		}
		if q.Before != nil && event.Timestamp.After(*q.Before) {
			continue
		}
		if q.Decision != "" && !strings.EqualFold(event.Decision, q.Decision) {
			continue
		}
		if q.Adapter != "" && !strings.EqualFold(event.Tool, q.Adapter) {
			continue
		}

		events = append(events, event)
		if q.Limit > 0 && len(events) >= q.Limit {
			break
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return events, nil
}
