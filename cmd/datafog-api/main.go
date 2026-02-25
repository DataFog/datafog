package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/felixge/fgprof"
	"go.uber.org/automaxprocs/maxprocs"

	"github.com/datafog/datafog-api/internal/policy"
	"github.com/datafog/datafog-api/internal/receipts"
	"github.com/datafog/datafog-api/internal/server"
	"github.com/datafog/datafog-api/internal/shim"
)

func main() {
	revertAuto := configureMaxProcs(log.Default())
	defer revertAuto()

	policyPath := getenv("DATAFOG_POLICY_PATH", "config/policy.json")
	receiptPath := getenv("DATAFOG_RECEIPT_PATH", "datafog_receipts.jsonl")
	apiToken := getenv("DATAFOG_API_TOKEN", "")
	addr := getenv("DATAFOG_ADDR", ":8080")
	rateLimitRPS := getenvInt("DATAFOG_RATE_LIMIT_RPS", 0)
	shutdownTimeout := getenvDuration("DATAFOG_SHUTDOWN_TIMEOUT", 10*time.Second)
	enableDemo := getenv("DATAFOG_ENABLE_DEMO", "") != "" || hasFlag("--enable-demo")
	eventsPath := getenv("DATAFOG_EVENTS_PATH", "datafog_events.ndjson")
	pprofAddr := getenv("DATAFOG_PPROF_ADDR", "")
	fgprofEnabled := getenvBool("DATAFOG_FGPROF", false)

	policyData, err := policy.LoadPolicyFromFile(policyPath)
	if err != nil {
		log.Fatalf("load policy: %v", err)
	}

	store, err := receipts.NewReceiptStore(receiptPath)
	if err != nil {
		log.Fatalf("init receipts: %v", err)
	}

	eventSink := shim.NewNDJSONDecisionEventSink(eventsPath)

	h := server.New(policyData, store, log.Default(), apiToken, rateLimitRPS)
	h.SetEventReader(eventSink)

	var handler http.Handler
	if enableDemo {
		// Create a shim gate backed by a local HTTP decision client
		client := shim.NewHTTPDecisionClient("http://127.0.0.1"+addr, apiToken)
		gate := shim.NewGate(client, shim.WithEventSink(eventSink))

		demoHTMLPath := getenv("DATAFOG_DEMO_HTML", "docs/demo.html")
		demo, err := server.NewDemoHandler(gate, h, demoHTMLPath)
		if err != nil {
			log.Fatalf("init demo: %v", err)
		}
		defer demo.Cleanup()

		handler = h.HandlerWithDemo(demo)
		log.Printf("demo mode enabled — /demo/exec, /demo/write-file, /demo/read-file available")
	} else {
		handler = h.Handler()
	}

	var pprofSrv *http.Server
	if pprofAddr != "" {
		pprofSrv = startProfilingServer(pprofAddr, fgprofEnabled, log.Default())
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadTimeout:       getenvDuration("DATAFOG_READ_TIMEOUT", 5*time.Second),
		ReadHeaderTimeout: getenvDuration("DATAFOG_READ_HEADER_TIMEOUT", 2*time.Second),
		WriteTimeout:      getenvDuration("DATAFOG_WRITE_TIMEOUT", 10*time.Second),
		IdleTimeout:       getenvDuration("DATAFOG_IDLE_TIMEOUT", 30*time.Second),
		MaxHeaderBytes:    1 << 20, // 1 MiB
		ErrorLog:          log.Default(),
	}

	log.Printf("datafog-api listening on %s", addr)
	done := make(chan error, 1)
	go func() {
		done <- srv.ListenAndServe()
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sig)

	select {
	case err := <-done:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
		}
	case <-sig:
		log.Printf("shutdown signal received")
		ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()

		if pprofSrv != nil {
			if err := pprofSrv.Shutdown(ctx); err != nil {
				log.Printf("pprof server shutdown failed: %v", err)
				if closeErr := pprofSrv.Close(); closeErr != nil && !errors.Is(closeErr, http.ErrServerClosed) {
					log.Printf("pprof server forced close failed: %v", closeErr)
				}
			}
		}
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("graceful shutdown failed: %v", err)
			if closeErr := srv.Close(); closeErr != nil && !errors.Is(closeErr, http.ErrServerClosed) {
				log.Printf("forced close failed: %v", closeErr)
			}
		}
		if err := <-done; err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("server stopped with error: %v", err)
		}
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		log.Printf("invalid duration for %s=%q, using fallback %s", key, value, fallback)
		return fallback
	}
	return parsed
}

func getenvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		log.Printf("invalid integer for %s=%q, using fallback %d", key, value, fallback)
		return fallback
	}
	return parsed
}

func hasFlag(flag string) bool {
	for _, arg := range os.Args[1:] {
		if arg == flag {
			return true
		}
	}
	return false
}

func getenvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	switch value {
	case "1", "true", "t", "yes", "y", "on":
		return true
	case "0", "false", "f", "no", "n", "off":
		return false
	}
	return fallback
}

func configureMaxProcs(logger *log.Logger) func() {
	if logger == nil {
		logger = log.Default()
	}
	undo, err := maxprocs.Set(maxprocs.Logger(func(format string, args ...interface{}) {
		logger.Printf(format, args...)
	}))
	if err != nil {
		logger.Printf("maxprocs configuration skipped: %v", err)
		return func() {}
	}
	return undo
}

func startProfilingServer(addr string, enableFGProf bool, logger *log.Logger) *http.Server {
	mux := http.NewServeMux()
	mux.Handle("/debug/pprof/", http.DefaultServeMux)
	if enableFGProf {
		mux.Handle("/debug/fgprof", fgprof.Handler())
	}

	srv := &http.Server{Addr: addr, Handler: mux}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Printf("pprof server exited: %v", err)
		}
	}()
	logger.Printf("pprof enabled at http://%s/debug/pprof/", addr)
	if enableFGProf {
		logger.Printf("fgprof enabled at http://%s/debug/fgprof", addr)
	}
	return srv
}
