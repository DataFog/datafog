package server

import (
	"net/http"
	"os"
)

// AdminHandler serves a lightweight read-only admin dashboard page.
type AdminHandler struct {
	adminHTML []byte
}

// NewAdminHandler creates an admin dashboard handler backed by the given HTML asset.
func NewAdminHandler(htmlPath string) (*AdminHandler, error) {
	if htmlPath == "" {
		htmlPath = "docs/admin.html"
	}

	html, err := os.ReadFile(htmlPath)
	if err != nil {
		return nil, err
	}

	return &AdminHandler{adminHTML: html}, nil
}

// Register adds the admin endpoint to the given mux.
func (d *AdminHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/admin", d.handleAdminPage)
}

func (d *AdminHandler) handleAdminPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(d.adminHTML)
}
