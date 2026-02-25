---
title: "Frontend"
use_when: "Documenting frontend stack conventions and UI touchpoints for this repo."
---

## Stack

DataFog API is a backend-first project. There is no React/Vue/Next.js application in this repository.

- Primary user-facing UI is API-first: clients interact through HTTP endpoints.
- Optional demo assets are static HTML in `docs/demo.html` and rendered by `GET /demo` when demo mode is enabled.

## Conventions

- Keep behavior explicit and minimal in UI entrypoints.
- Avoid introducing framework lock-in for optional demo surfaces.
- Maintain parity between API behavior and demo output (e.g., transformed/blocked responses in demo should mirror API semantics).

## Component Architecture

- `internal/server` owns all HTTP handlers, including demo handlers (`internal/server/demo.go`).
- Demo UI is static and delegates control flow to the API; business rules remain server-side.
- Policy gate behavior belongs to `internal/shim` and should not duplicate policy logic in the UI.

## Performance

- No frontend bundling/runtime overhead is shipped as part of the core service.
- For optional demo HTML, prefer lightweight markup/CSS/vanilla JS and short payloads from the API.

## Accessibility

- Demo HTML should remain keyboard-operable and avoid hidden controls that block screen readers.
- Use semantic markup in docs pages (`button`, `section`, headings, labels).
- Keep contrast and focus states explicit when editing future visual components.
