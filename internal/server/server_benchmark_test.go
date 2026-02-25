package server

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/datafog/datafog-api/internal/receipts"
)

func BenchmarkScanEndpoint(b *testing.B) {
	server := benchmarkServer(b)
	payload := `{"text":"Email is jane@example.com and phone is +1 415 555 0199"}`

	b.ReportAllocs()
	b.SetBytes(int64(len(payload)))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/scan", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		resp := httptest.NewRecorder()
		server.Handler.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", resp.Code)
		}
	}
}

func BenchmarkDecideEndpoint(b *testing.B) {
	server := benchmarkServer(b)
	payload := `{"action":{"type":"file.read","resource":"notes.txt","tool":"cat","sensitive":false}}`

	b.ReportAllocs()
	b.SetBytes(int64(len(payload)))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/decide", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		resp := httptest.NewRecorder()
		server.Handler.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", resp.Code)
		}
	}
}

func benchmarkServer(b *testing.B) *http.Server {
	store, err := receipts.NewReceiptStore(b.TempDir() + "/receipts.jsonl")
	if err != nil {
		b.Fatalf("new store: %v", err)
	}
	h := New(testPolicy(), store, log.New(io.Discard, "", 0), "", 0)
	return &http.Server{Handler: h.Handler()}
}
