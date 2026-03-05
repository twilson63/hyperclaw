package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/gorilla/mux"
	"github.com/hyperclaw/orchestrator/internal/api"
	"github.com/hyperclaw/orchestrator/internal/instances"
)

func main() {
	// Configuration from environment
	port := getEnv("ORCHESTRATOR_PORT", "8080")
	hostID := getEnv("HOST_ID", "host-001")
	snapshotPath := getEnv("SNAPSHOT_PATH", "./snapshots")

	logger := log.New(os.Stdout, "[orchestrator] ", log.LstdFlags)

	logger.Printf("🚀 HyperClaw Orchestrator")
	logger.Printf("   Host ID: %s", hostID)
	logger.Printf("   Port: %s", port)
	logger.Printf("   Snapshot Path: %s", snapshotPath)

	// Initialize instance manager
	manager := instances.NewManager(hostID, snapshotPath)

	// Setup router
	router := mux.NewRouter()

	// Health check
	router.HandleFunc("/health", api.HealthHandler).Methods("GET")

	// API routes
	apiRouter := router.PathPrefix("/api/v1").Subrouter()
	apiRouter.HandleFunc("/instances", api.ListInstancesHandler(manager)).Methods("GET")
	apiRouter.HandleFunc("/instances", api.CreateInstanceHandler(manager)).Methods("POST")
	apiRouter.HandleFunc("/instances/{id}", api.GetInstanceHandler(manager)).Methods("GET")
	apiRouter.HandleFunc("/instances/{id}", api.DeleteInstanceHandler(manager)).Methods("DELETE")
	apiRouter.HandleFunc("/instances/{id}/start", api.StartInstanceHandler(manager)).Methods("POST")
	apiRouter.HandleFunc("/instances/{id}/stop", api.StopInstanceHandler(manager)).Methods("POST")
	apiRouter.HandleFunc("/instances/{id}/console", api.ConsoleHandler(manager)).Methods("GET")
	apiRouter.HandleFunc("/instances/{id}/logs", api.LogsHandler(manager)).Methods("GET")
	apiRouter.HandleFunc("/stats", api.StatsHandler(manager)).Methods("GET")

	// Start server in goroutine
	go func() {
		logger.Printf("Starting server on :%s", port)
		if err := http.ListenAndServe(":"+port, router); err != nil {
			logger.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	logger.Println("Shutting down gracefully...")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}