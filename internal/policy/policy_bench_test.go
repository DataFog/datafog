package policy

import (
	"testing"

	"github.com/datafog/datafog-api/internal/models"
)

var benchmarkPolicy = models.Policy{
	PolicyID:      "bench",
	PolicyVersion: "v1",
	Rules: []models.Rule{
		{ID: "allow-write", Effect: models.DecisionAllow, Match: models.MatchCriteria{ActionTypes: []string{"file.write"}}, Priority: 10},
		{ID: "transform-api-key", Effect: models.DecisionTransform, Match: models.MatchCriteria{ActionTypes: []string{"file.read"}}, EntityRequirements: []string{"api_key"}, Priority: 50},
		{ID: "transform-ssn", Effect: models.DecisionTransform, Match: models.MatchCriteria{ActionTypes: []string{"db.query"}}, EntityRequirements: []string{"ssn"}, Priority: 70},
		{ID: "deny-shell", Effect: models.DecisionDeny, Match: models.MatchCriteria{ActionTypes: []string{"shell.exec"}}, Priority: 100},
		{ID: "redact-person", Effect: models.DecisionAllowWithRedaction, Match: models.MatchCriteria{ActionTypes: []string{"chat.send"}}, EntityRequirements: []string{"person"}, Priority: 30},
		{ID: "allow-default", Effect: models.DecisionAllow, Match: models.MatchCriteria{ActionTypes: []string{"*"}}, Priority: 1},
	},
}

func BenchmarkPolicyEvaluateSorted(b *testing.B) {
	p := NormalizeForEvaluation(benchmarkPolicy)
	ctx := DecisionContext{
		Action: models.ActionMeta{
			Type:     "shell.exec",
			Tool:     "bash",
			Resource: "id_rsa",
		},
		Findings: []models.ScanFinding{
			{EntityType: "api_key", Value: "AKIA...", Confidence: 0.95},
			{EntityType: "person", Value: "Ada Lovelace", Confidence: 0.9},
		},
	}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = EvaluateSorted(p, ctx)
	}
}

func BenchmarkPolicyEvaluateUnsorted(b *testing.B) {
	p := benchmarkPolicy
	ctx := DecisionContext{
		Action: models.ActionMeta{
			Type:     "shell.exec",
			Tool:     "bash",
			Resource: "id_rsa",
		},
		Findings: []models.ScanFinding{
			{EntityType: "api_key", Value: "AKIA...", Confidence: 0.95},
			{EntityType: "person", Value: "Ada Lovelace", Confidence: 0.9},
		},
	}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = Evaluate(p, ctx)
	}
}
