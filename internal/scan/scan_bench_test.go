package scan

import (
	"testing"
)

var (
	smallText  = "The email is alice@example.com and phone is +1 415-555-0199."
	mediumText = "user=jane@example.com; token=AKIAIOSFODNN7EXAMPLE; card=4111 1111 1111 1111; api_key=abcd1234efgh5678ijkl; ssn=123-45-6789"
	largeText  = mediumText + " " + mediumText + " " + mediumText + " " + mediumText
)

func BenchmarkScanTextSmall(b *testing.B) {
	reportScannerPerf(b, smallText, nil)
}

func BenchmarkScanTextMedium(b *testing.B) {
	reportScannerPerf(b, mediumText, nil)
}

func BenchmarkScanTextLarge(b *testing.B) {
	reportScannerPerf(b, largeText, nil)
}

func BenchmarkScanTextWithFilter(b *testing.B) {
	reportScannerPerf(b, mediumText, []string{"email", "api_key", "credit_card"})
}

func reportScannerPerf(b *testing.B, text string, filter []string) {
	b.Helper()
	b.ReportAllocs()
	b.SetBytes(int64(len(text)))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ScanText(text, filter)
	}
}
