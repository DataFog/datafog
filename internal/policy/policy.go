package policy

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/datafog/datafog-api/internal/adapters"
	"github.com/datafog/datafog-api/internal/models"
)

var RequiredDecisionInputs = map[models.Decision]struct{}{
	models.DecisionAllow:              {},
	models.DecisionDeny:               {},
	models.DecisionTransform:          {},
	models.DecisionAllowWithRedaction: {},
}

func LoadPolicyFromFile(path string) (models.Policy, error) {
	var policy models.Policy

	policyPath := strings.TrimSpace(path)
	if strings.ContainsRune(policyPath, 0) {
		return policy, fmt.Errorf("invalid policy path")
	}
	policyPath = filepath.Clean(policyPath)
	if policyPath == "." {
		return policy, fmt.Errorf("invalid policy path")
	}

	content, err := os.ReadFile(policyPath) // #nosec G304 -- path comes from DATAFOG_POLICY_PATH and is validated by startup config.
	if err != nil {
		return policy, err
	}
	if err := json.Unmarshal(content, &policy); err != nil {
		return policy, err
	}
	if err := ValidatePolicy(policy); err != nil {
		return policy, err
	}
	return policy, nil
}

func ValidatePolicy(policy models.Policy) error {
	errors := make([]string, 0)
	if strings.TrimSpace(policy.PolicyID) == "" {
		errors = append(errors, "policy_id is required")
	}
	if strings.TrimSpace(policy.PolicyVersion) == "" {
		errors = append(errors, "policy_version is required")
	}
	if len(policy.Rules) == 0 {
		errors = append(errors, "policy must contain at least one rule")
	}

	seenRuleIDs := map[string]struct{}{}
	for _, rule := range policy.Rules {
		ruleID := strings.TrimSpace(rule.ID)
		if ruleID == "" {
			errors = append(errors, "rule missing id")
			continue
		}
		if _, ok := seenRuleIDs[ruleID]; ok {
			errors = append(errors, fmt.Sprintf("duplicate rule id: %s", ruleID))
		}
		seenRuleIDs[ruleID] = struct{}{}
		if rule.Priority < 0 {
			errors = append(errors, fmt.Sprintf("rule %s has negative priority: %d", ruleID, rule.Priority))
		}
		if _, ok := RequiredDecisionInputs[rule.Effect]; !ok {
			errors = append(errors, fmt.Sprintf("rule %s has unsupported effect: %s", ruleID, rule.Effect))
		}
		for _, actionType := range rule.Match.ActionTypes {
			if strings.TrimSpace(actionType) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty action_type condition", ruleID))
			}
		}
		for _, tool := range rule.Match.Tools {
			if strings.TrimSpace(tool) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty tool condition", ruleID))
			}
		}
		for _, prefix := range rule.Match.ResourcePrefix {
			if strings.TrimSpace(prefix) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty resource_prefix condition", ruleID))
			}
		}
		for _, command := range rule.Match.Commands {
			if strings.TrimSpace(command) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty command condition", ruleID))
			}
		}
		for _, arg := range rule.Match.Args {
			if strings.TrimSpace(arg) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty arg condition", ruleID))
			}
		}
		for _, adapter := range rule.Match.Adapters {
			if strings.TrimSpace(adapter) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty adapter condition", ruleID))
			}
		}
		for _, requirement := range rule.EntityRequirements {
			reqName := strings.ToLower(strings.TrimSpace(requirement))
			if reqName == "" {
				errors = append(errors, fmt.Sprintf("rule %s has empty entity_requirement", ruleID))
				continue
			}
			if _, ok := defaultEntityTypes[reqName]; !ok {
				errors = append(errors, fmt.Sprintf("rule %s references unsupported required entity type: %s", ruleID, requirement))
			}
		}
		for _, step := range rule.EntityTransforms {
			if strings.TrimSpace(step.EntityType) == "" {
				errors = append(errors, fmt.Sprintf("rule %s has entity transform without entity_type", ruleID))
				continue
			}
			entityType := strings.ToLower(strings.TrimSpace(step.EntityType))
			if _, ok := defaultEntityTypes[entityType]; !ok {
				errors = append(errors, fmt.Sprintf("rule %s references unsupported transform entity type: %s", ruleID, step.EntityType))
			}
			if _, ok := allowedModes[step.Mode]; !ok {
				errors = append(errors, fmt.Sprintf("rule %s references unsupported transform mode: %s", ruleID, step.Mode))
			}
		}
	}

	if len(errors) == 0 {
		return nil
	}
	return fmt.Errorf("%s", strings.Join(errors, "; "))
}

var allowedModes = map[models.TransformMode]struct{}{
	models.TransformModeMask:      {},
	models.TransformModeTokenize:  {},
	models.TransformModeAnonymize: {},
	models.TransformModeRedact:    {},
	models.TransformModeReplace:   {},
	models.TransformModeHash:      {},
}

// NormalizeForEvaluation returns a copy of policy with rules sorted by priority descending.
// Higher priority rules are evaluated first.
func NormalizeForEvaluation(policy models.Policy) models.Policy {
	rules := append([]models.Rule(nil), policy.Rules...)
	sort.SliceStable(rules, func(i, j int) bool {
		return rules[i].Priority > rules[j].Priority
	})
	policy.Rules = rules
	return policy
}

// Evaluate evaluates a decision using policy rules.
//
// For hot paths, callers should use EvaluateSorted with a normalized policy
// (created by NormalizeForEvaluation) to avoid repeated sorting.
func Evaluate(policy models.Policy, ctx DecisionContext) DecisionResult {
	return EvaluateSorted(NormalizeForEvaluation(policy), ctx)
}

// EvaluateSorted evaluates policy decisions assuming rules are already sorted
// by priority descending.
type PolicyIndex struct {
	byAction map[string][]models.Rule
}

// BuildPolicyIndex precomputes policy lookup tables for faster action-based filtering.
// Policy rules are expected to already be in evaluation order.
func BuildPolicyIndex(policy models.Policy) *PolicyIndex {
	index := &PolicyIndex{byAction: make(map[string][]models.Rule, len(policy.Rules))}
	for _, rule := range policy.Rules {
		if len(rule.Match.ActionTypes) == 0 {
			index.byAction["*"] = append(index.byAction["*"], rule)
			continue
		}
		for _, actionType := range rule.Match.ActionTypes {
			normalized := strings.ToLower(strings.TrimSpace(actionType))
			if normalized == "" {
				continue
			}
			index.byAction[normalized] = append(index.byAction[normalized], rule)
		}
	}
	return index
}

func (idx *PolicyIndex) rulesForAction(actionType string) []models.Rule {
	if idx == nil {
		return nil
	}

	normalizedActionType := strings.ToLower(strings.TrimSpace(actionType))
	actionRules := idx.byAction[normalizedActionType]
	wildcard := idx.byAction["*"]
	matched := make([]models.Rule, 0, len(actionRules)+len(wildcard))
	matched = append(matched, actionRules...)
	matched = append(matched, wildcard...)

	if len(matched) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(matched))
	ordered := make([]models.Rule, 0, len(matched))
	for _, rule := range matched {
		if _, ok := seen[rule.ID]; ok {
			continue
		}
		seen[rule.ID] = struct{}{}
		ordered = append(ordered, rule)
	}
	return ordered
}

type DecisionContext struct {
	Action   models.ActionMeta
	Findings []models.ScanFinding
}

type DecisionResult struct {
	Decision      models.Decision
	MatchedRules  []string
	TransformPlan []models.TransformStep
	Reason        string
}

func EvaluateSorted(policy models.Policy, ctx DecisionContext) DecisionResult {
	return EvaluateWithIndex(policy, nil, ctx)
}

// EvaluateWithIndex is the hot-path implementation that can use a precomputed policy index.
func EvaluateWithIndex(policy models.Policy, index *PolicyIndex, ctx DecisionContext) DecisionResult {
	if ctx.Action.Type == "" {
		return DecisionResult{
			Decision: models.DecisionDeny,
			Reason:   "action.type is required",
		}
	}

	if len(policy.Rules) == 0 {
		return DecisionResult{
			Decision: models.DecisionDeny,
			Reason:   "policy has no rules",
		}
	}

	rules := policy.Rules
	if index != nil {
		rules = index.rulesForAction(ctx.Action.Type)
	}

	hasFindings := map[string]struct{}{}
	for _, f := range ctx.Findings {
		hasFindings[strings.ToLower(f.EntityType)] = struct{}{}
	}

	matchIDs := []string{}
	transformPlan := []models.TransformStep{}
	transformFound := false
	transformWithRedaction := false
	denyReason := ""
	denyMatched := false

	matched := false
	for _, rule := range rules {
		if _, ok := RequiredDecisionInputs[rule.Effect]; !ok {
			continue
		}
		if !matchAction(rule.Match, rule.RequireSensitiveOnly, ctx.Action) {
			continue
		}
		if !hasRequiredEntities(rule.EntityRequirements, hasFindings) {
			continue
		}
		matched = true
		matchIDs = append(matchIDs, rule.ID)

		switch rule.Effect {
		case models.DecisionDeny:
			denyMatched = true
			if denyReason == "" {
				denyReason = rule.Description
			}
		case models.DecisionTransform:
			transformFound = true
			if len(rule.EntityTransforms) > 0 {
				transformPlan = append(transformPlan, rule.EntityTransforms...)
			}
		case models.DecisionAllowWithRedaction:
			transformWithRedaction = true
		}
	}

	if denyMatched {
		return DecisionResult{
			Decision:      models.DecisionDeny,
			MatchedRules:  matchIDs,
			TransformPlan: nil,
			Reason:        denyReason,
		}
	}
	if transformFound {
		if len(transformPlan) == 0 {
			transformPlan = defaultEntityTransforms
		}
		return DecisionResult{
			Decision:      models.DecisionTransform,
			MatchedRules:  matchIDs,
			TransformPlan: transformPlan,
		}
	}
	if transformWithRedaction {
		if len(transformPlan) == 0 {
			transformPlan = defaultEntityTransforms
		}
		return DecisionResult{
			Decision:      models.DecisionAllowWithRedaction,
			MatchedRules:  matchIDs,
			TransformPlan: transformPlan,
		}
	}
	if matched {
		return DecisionResult{
			Decision:     models.DecisionAllow,
			MatchedRules: matchIDs,
		}
	}

	return DecisionResult{
		Decision: models.DecisionDeny,
		Reason:   "no matching rule",
	}
}

var defaultEntityTransforms = []models.TransformStep{
	{EntityType: "email", Mode: models.TransformModeMask},
	{EntityType: "phone", Mode: models.TransformModeTokenize},
	{EntityType: "ssn", Mode: models.TransformModeAnonymize},
	{EntityType: "api_key", Mode: models.TransformModeRedact},
	{EntityType: "credit_card", Mode: models.TransformModeRedact},
	{EntityType: "ip_address", Mode: models.TransformModeMask},
	{EntityType: "date", Mode: models.TransformModeMask},
	{EntityType: "zip_code", Mode: models.TransformModeMask},
	{EntityType: "person", Mode: models.TransformModeRedact},
	{EntityType: "organization", Mode: models.TransformModeMask},
	{EntityType: "location", Mode: models.TransformModeMask},
}

var defaultEntityTypes = map[string]struct{}{
	"email":        {},
	"phone":        {},
	"ssn":          {},
	"api_key":      {},
	"credit_card":  {},
	"ip_address":   {},
	"date":         {},
	"zip_code":     {},
	"person":       {},
	"organization": {},
	"location":     {},
}

func matchAction(match models.MatchCriteria, requireSensitiveOnly bool, action models.ActionMeta) bool {
	if !matchesField(match.ActionTypes, action.Type) {
		return false
	}
	if !matchesField(match.Tools, action.Tool) {
		return false
	}
	if !matchesField(match.Commands, action.Command) {
		return false
	}
	if !matchesArgs(match.Args, action.Args) {
		return false
	}
	if !adapters.MatchesAdapter(action.Tool, match.Adapters) {
		return false
	}
	if requireSensitiveOnly && !action.Sensitive {
		return false
	}
	if len(match.ResourcePrefix) > 0 && action.Resource == "" {
		return false
	}
	for _, prefix := range match.ResourcePrefix {
		if strings.HasPrefix(action.Resource, prefix) {
			return true
		}
	}
	if len(match.ResourcePrefix) > 0 {
		return false
	}
	return true
}

func matchesArgs(required []string, args []string) bool {
	if len(required) == 0 {
		return true
	}
	if len(args) == 0 {
		return false
	}

	for _, expected := range required {
		matched := false
		for _, value := range args {
			if matchesField([]string{expected}, value) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}
	return true
}

func matchesField(allowed []string, value string) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, allow := range allowed {
		if strings.EqualFold(allow, value) {
			return true
		}
	}
	return false
}

func hasRequiredEntities(reqs []string, found map[string]struct{}) bool {
	for _, req := range reqs {
		reqName := strings.ToLower(strings.TrimSpace(req))
		if _, ok := defaultEntityTypes[reqName]; !ok {
			return false
		}
		if _, ok := found[reqName]; !ok {
			return false
		}
	}
	return true
}

func (res DecisionResult) String() string {
	return fmt.Sprintf("%s decision=%s matched=%v reason=%s", res.Decision, res.Decision, res.MatchedRules, res.Reason)
}
