package scan

import "strings"

func requestedEntitySet(entityFilter []string) map[string]struct{} {
	if len(entityFilter) == 0 {
		return nil
	}
	requested := make(map[string]struct{}, len(entityFilter))
	for _, name := range entityFilter {
		entity := strings.ToLower(strings.TrimSpace(name))
		if entity == "" {
			continue
		}
		requested[entity] = struct{}{}
	}
	if len(requested) == 0 {
		return nil
	}
	return requested
}

func shouldRunEntityType(requested map[string]struct{}, entityType string) bool {
	if len(requested) == 0 {
		return true
	}
	_, ok := requested[entityType]
	return ok
}

func shouldRunEntity(requested map[string]struct{}, entityType string) bool {
	return shouldRunEntityType(requested, entityType)
}

func shouldRunNERForFilter(requested map[string]struct{}) bool {
	if len(requested) == 0 {
		return true
	}
	if _, ok := requested["person"]; ok {
		return true
	}
	if _, ok := requested["organization"]; ok {
		return true
	}
	if _, ok := requested["location"]; ok {
		return true
	}
	return false
}
