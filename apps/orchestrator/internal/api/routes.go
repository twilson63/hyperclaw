package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/hyperclaw/orchestrator/internal/instances"
)

// HealthHandler returns the health status
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"type":   "orchestrator",
	})
}

// ListInstancesHandler returns all instances
func ListInstancesHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		instances := mgr.List()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"instances": instances,
		})
	}
}

// CreateInstanceHandler creates a new instance
func CreateInstanceHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var cfg instances.Config
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Validate
		if cfg.Name == "" {
			http.Error(w, "name is required", http.StatusBadRequest)
			return
		}

		// Create instance
		instance, err := mgr.Create(cfg)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"instance": instance,
		})
	}
}

// GetInstanceHandler returns a single instance
func GetInstanceHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		instance, err := mgr.Get(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"instance": instance,
		})
	}
}

// DeleteInstanceHandler stops and deletes an instance
func DeleteInstanceHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		if err := mgr.Delete(id); err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "deleted",
		})
	}
}

// StartInstanceHandler starts a stopped instance
func StartInstanceHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		if err := mgr.Start(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		instance, _ := mgr.Get(id)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"instance": instance,
		})
	}
}

// StopInstanceHandler stops a running instance
func StopInstanceHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		if err := mgr.Stop(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		instance, _ := mgr.Get(id)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"instance": instance,
		})
	}
}

// ConsoleHandler handles WebSocket connections for serial console
func ConsoleHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		instance, err := mgr.Get(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		// Upgrade to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		// Proxy to serial console
		handleSerialConsole(conn, instance)
	}
}

// LogsHandler returns instance logs
func LogsHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		_, err := mgr.Get(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		// TODO: Read actual logs from Firecracker
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"logs": []map[string]string{
				{"time": "2024-01-01T00:00:00Z", "level": "info", "message": "VM started"},
				{"time": "2024-01-01T00:00:01Z", "level": "info", "message": "Network configured"},
				{"time": "2024-01-01T00:00:02Z", "level": "info", "message": "NullClaw initialized"},
			},
		})
	}
}

// StatsHandler returns instance statistics
func StatsHandler(mgr *instances.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := mgr.Stats()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}
}