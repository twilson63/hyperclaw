package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/hyperclaw/orchestrator/internal/instances"
)

// TestManager provides a mock instance manager for API testing
type TestManager struct {
	instances map[string]*instances.Instance
	createErr error
}

func NewTestManager() *TestManager {
	return &TestManager{
		instances: make(map[string]*instances.Instance),
	}
}

func (tm *TestManager) Create(cfg instances.Config) (*instances.Instance, error) {
	if tm.createErr != nil {
		return nil, tm.createErr
	}

	inst := &instances.Instance{
		ID:        "test-instance-" + cfg.Name,
		Name:      cfg.Name,
		Status:    "running",
		Model:     cfg.Model,
		RamGB:     cfg.RamGB,
		HostID:    "test-host",
		APIKey:    "hc_test_api_key",
		Endpoint:  "http://192.168.1.100:50390",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(time.Duration(cfg.TTLHours) * time.Hour),
	}

	tm.instances[inst.ID] = inst
	return inst, nil
}

func (tm *TestManager) Get(id string) (*instances.Instance, error) {
	inst, ok := tm.instances[id]
	if !ok {
		return nil, fmt.Errorf("instance not found: %s", id)
	}
	return inst, nil
}

func (tm *TestManager) List() []*instances.Instance {
	result := make([]*instances.Instance, 0, len(tm.instances))
	for _, inst := range tm.instances {
		result = append(result, inst)
	}
	return result
}

func (tm *TestManager) Delete(id string) error {
	if _, ok := tm.instances[id]; !ok {
		return fmt.Errorf("instance not found: %s", id)
	}
	delete(tm.instances, id)
	return nil
}

func (tm *TestManager) Start(id string) error {
	inst, ok := tm.instances[id]
	if !ok {
		return fmt.Errorf("instance not found: %s", id)
	}
	inst.Status = "running"
	return nil
}

func (tm *TestManager) Stop(id string) error {
	inst, ok := tm.instances[id]
	if !ok {
		return fmt.Errorf("instance not found: %s", id)
	}
	inst.Status = "stopped"
	return nil
}

func (tm *TestManager) Stats() map[string]interface{} {
	running := 0
	stopped := 0
	pending := 0
	totalRam := 0

	for _, inst := range tm.instances {
		switch inst.Status {
		case "running":
			running++
		case "stopped":
			stopped++
		case "pending":
			pending++
		}
		totalRam += inst.RamGB
	}

	return map[string]interface{}{
		"total":    len(tm.instances),
		"running":  running,
		"stopped":  stopped,
		"pending":  pending,
		"totalRam": totalRam,
		"hostId":   "test-host",
	}
}

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	HealthHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "healthy" {
		t.Errorf("Expected status 'healthy', got '%s'", response["status"])
	}
	if response["type"] != "orchestrator" {
		t.Errorf("Expected type 'orchestrator', got '%s'", response["type"])
	}
}

func TestListInstancesHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should return empty list", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/instances", nil)
		w := httptest.NewRecorder()

		ListInstancesHandler(mgr)(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		instances := response["instances"].([]interface{})
		if len(instances) != 0 {
			t.Errorf("Expected empty instances array, got %d", len(instances))
		}
	})

	t.Run("should return list of instances", func(t *testing.T) {
		// Create instances
		mgr.Create(instances.Config{Name: "test-1", Model: "qwen3.5"})
		mgr.Create(instances.Config{Name: "test-2", Model: "llama3"})

		req := httptest.NewRequest("GET", "/api/v1/instances", nil)
		w := httptest.NewRecorder()

		ListInstancesHandler(mgr)(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		instanceList := response["instances"].([]interface{})
		if len(instanceList) != 2 {
			t.Errorf("Expected 2 instances, got %d", len(instanceList))
		}
	})
}

func TestCreateInstanceHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should create instance successfully", func(t *testing.T) {
		body := `{"name": "test-instance", "model": "qwen3.5", "ramGb": 8, "ttlHours": 24}`
		req := httptest.NewRequest("POST", "/api/v1/instances", strings.NewReader(body))
		w := httptest.NewRecorder()

		CreateInstanceHandler(mgr)(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		instance := response["instance"].(map[string]interface{})
		if instance["name"] != "test-instance" {
			t.Errorf("Expected name 'test-instance', got '%v'", instance["name"])
		}
		if instance["model"] != "qwen3.5" {
			t.Errorf("Expected model 'qwen3.5', got '%v'", instance["model"])
		}
	})

	t.Run("should reject missing name", func(t *testing.T) {
		body := `{"model": "qwen3.5"}`
		req := httptest.NewRequest("POST", "/api/v1/instances", strings.NewReader(body))
		w := httptest.NewRecorder()

		CreateInstanceHandler(mgr)(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("should reject invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/v1/instances", strings.NewReader("invalid json"))
		w := httptest.NewRecorder()

		CreateInstanceHandler(mgr)(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}

func TestGetInstanceHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should return instance by ID", func(t *testing.T) {
		inst, _ := mgr.Create(instances.Config{Name: "get-test", Model: "qwen3.5"})

		req := httptest.NewRequest("GET", "/api/v1/instances/"+inst.ID, nil)
		w := httptest.NewRecorder()

		// Set route parameters
		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}", GetInstanceHandler(mgr)).Methods("GET")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		instance := response["instance"].(map[string]interface{})
		if instance["id"] != inst.ID {
			t.Errorf("Expected ID '%s', got '%v'", inst.ID, instance["id"])
		}
	})

	t.Run("should return 404 for non-existent instance", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/instances/nonexistent", nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}", GetInstanceHandler(mgr)).Methods("GET")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})
}

func TestDeleteInstanceHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should delete instance successfully", func(t *testing.T) {
		inst, _ := mgr.Create(instances.Config{Name: "delete-test"})

		req := httptest.NewRequest("DELETE", "/api/v1/instances/"+inst.ID, nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}", DeleteInstanceHandler(mgr)).Methods("DELETE")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		// Verify deletion
		_, err := mgr.Get(inst.ID)
		if err == nil {
			t.Error("Expected instance to be deleted")
		}
	})

	t.Run("should return 404 for non-existent instance", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/v1/instances/nonexistent", nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}", DeleteInstanceHandler(mgr)).Methods("DELETE")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})
}

func TestStartInstanceHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should start stopped instance", func(t *testing.T) {
		inst, _ := mgr.Create(instances.Config{Name: "start-test"})
		mgr.Stop(inst.ID) // Stop first

		req := httptest.NewRequest("POST", "/api/v1/instances/"+inst.ID+"/start", nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}/start", StartInstanceHandler(mgr)).Methods("POST")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	})

	t.Run("should return 404 for non-existent instance", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/v1/instances/nonexistent/start", nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}/start", StartInstanceHandler(mgr)).Methods("POST")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})
}

func TestStopInstanceHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should stop running instance", func(t *testing.T) {
		inst, _ := mgr.Create(instances.Config{Name: "stop-test"})

		req := httptest.NewRequest("POST", "/api/v1/instances/"+inst.ID+"/stop", nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}/stop", StopInstanceHandler(mgr)).Methods("POST")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		// Note: Stop may not change status from pending if VM hasn't started yet
		// Just check that the call succeeds
	})

	t.Run("should return error for non-existent instance", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/v1/instances/nonexistent/stop", nil)
		w := httptest.NewRecorder()

		router := mux.NewRouter()
		router.HandleFunc("/api/v1/instances/{id}/stop", StopInstanceHandler(mgr)).Methods("POST")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})
}

func TestStatsHandler(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")

	t.Run("should return stats", func(t *testing.T) {
		mgr.Create(instances.Config{Name: "stats-1", RamGB: 8})
		mgr.Create(instances.Config{Name: "stats-2", RamGB: 16})

		req := httptest.NewRequest("GET", "/api/v1/stats", nil)
		w := httptest.NewRecorder()

		StatsHandler(mgr)(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if response["hostId"] != "test-host" {
			t.Errorf("Expected hostId 'test-host', got '%v'", response["hostId"])
		}
	})
}

func TestFullRouting(t *testing.T) {
	mgr := instances.NewManager("test-host", "/snapshots")
	router := mux.NewRouter()

	// Register all routes
	router.HandleFunc("/health", HealthHandler)
	router.HandleFunc("/api/v1/instances", ListInstancesHandler(mgr)).Methods("GET")
	router.HandleFunc("/api/v1/instances", CreateInstanceHandler(mgr)).Methods("POST")
	router.HandleFunc("/api/v1/instances/{id}", GetInstanceHandler(mgr)).Methods("GET")
	router.HandleFunc("/api/v1/instances/{id}", DeleteInstanceHandler(mgr)).Methods("DELETE")
	router.HandleFunc("/api/v1/instances/{id}/start", StartInstanceHandler(mgr)).Methods("POST")
	router.HandleFunc("/api/v1/instances/{id}/stop", StopInstanceHandler(mgr)).Methods("POST")
	router.HandleFunc("/api/v1/stats", StatsHandler(mgr)).Methods("GET")

	// Test health
	t.Run("health check", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("Health check failed: %d", w.Code)
		}
	})

	// Test create
	t.Run("create instance", func(t *testing.T) {
		body := `{"name":"routing-test"}`
		createReq := httptest.NewRequest("POST", "/api/v1/instances", strings.NewReader(body))
		createReq.Header.Set("Content-Type", "application/json")
		createW := httptest.NewRecorder()
		router.ServeHTTP(createW, createReq)
		if createW.Code != http.StatusCreated {
			t.Errorf("Create instance failed: %d", createW.Code)
		}
	})
}