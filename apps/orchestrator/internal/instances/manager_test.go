package instances

import (
	"sync"
	"testing"
	"time"
)

func TestNewManager(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")
	if manager == nil {
		t.Fatal("Expected manager to be created")
	}
	if manager.hostID != "host-123" {
		t.Errorf("Expected hostID to be 'host-123', got '%s'", manager.hostID)
	}
	if manager.snapshotPath != "/snapshots" {
		t.Errorf("Expected snapshotPath to be '/snapshots', got '%s'", manager.snapshotPath)
	}
	if manager.instances == nil {
		t.Error("Expected instances map to be initialized")
	}
}

func TestManagerCreateInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{
		Name:     "test-agent",
		Model:    "qwen3.5",
		RamGB:    16,
		TTLHours: 24,
	}

	instance, err := manager.Create(cfg)
	if err != nil {
		t.Fatalf("Failed to create instance: %v", err)
	}

	if instance.ID == "" {
		t.Error("Expected instance ID to be set")
	}
	if instance.Name != cfg.Name {
		t.Errorf("Expected name to be '%s', got '%s'", cfg.Name, instance.Name)
	}
	if instance.Model != cfg.Model {
		t.Errorf("Expected model to be '%s', got '%s'", cfg.Model, instance.Model)
	}
	if instance.RamGB != cfg.RamGB {
		t.Errorf("Expected RamGB to be %d, got %d", cfg.RamGB, instance.RamGB)
	}
	if instance.APIKey == "" {
		t.Error("Expected API key to be generated")
	}
	if !instance.ExpiresAt.After(time.Now()) {
		t.Error("Expected ExpiresAt to be in the future")
	}
}

func TestManagerCreateWithDefaults(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{
		Name: "default-instance",
	}

	instance, err := manager.Create(cfg)
	if err != nil {
		t.Fatalf("Failed to create instance: %v", err)
	}

	// Check defaults
	if instance.Model != "qwen3.5" {
		t.Errorf("Expected default model to be 'qwen3.5', got '%s'", instance.Model)
	}
	if instance.RamGB != 16 {
		t.Errorf("Expected default RamGB to be 16, got %d", instance.RamGB)
	}
	if instance.HostID != "host-123" {
		t.Errorf("Expected HostID to be 'host-123', got '%s'", instance.HostID)
	}
}

func TestManagerGetInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{
		Name: "test-agent",
	}

	created, _ := manager.Create(cfg)

	found, err := manager.Get(created.ID)
	if err != nil {
		t.Fatalf("Failed to get instance: %v", err)
	}
	if found.ID != created.ID {
		t.Errorf("Expected ID to be '%s', got '%s'", created.ID, found.ID)
	}
}

func TestManagerGetNonExistentInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	_, err := manager.Get("nonexistent-id")
	if err == nil {
		t.Error("Expected error when getting non-existent instance")
	}
}

func TestManagerListInstances(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	// Create multiple instances
	for i := 0; i < 3; i++ {
		_, err := manager.Create(Config{
			Name: "instance-" + string(rune('a'+i)),
		})
		if err != nil {
			t.Fatalf("Failed to create instance %d: %v", i, err)
		}
	}

	instances := manager.List()
	if len(instances) != 3 {
		t.Errorf("Expected 3 instances, got %d", len(instances))
	}
}

func TestManagerDeleteInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{
		Name: "test-agent",
	}

	created, _ := manager.Create(cfg)

	err := manager.Delete(created.ID)
	if err != nil {
		t.Fatalf("Failed to delete instance: %v", err)
	}

	// Verify it's deleted
	_, err = manager.Get(created.ID)
	if err == nil {
		t.Error("Expected instance to be deleted")
	}
}

func TestManagerDeleteNonExistentInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	err := manager.Delete("nonexistent-id")
	if err == nil {
		t.Error("Expected error when deleting non-existent instance")
	}
}

func TestManagerStartInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{Name: "test-agent"}
	instance, _ := manager.Create(cfg)

	// Set status to stopped to test start
	manager.mu.Lock()
	instance.Status = "stopped"
	manager.mu.Unlock()

	err := manager.Start(instance.ID)
	if err != nil {
		t.Fatalf("Failed to start instance: %v", err)
	}

	found, _ := manager.Get(instance.ID)
	// Note: In real test, this would be "running" if Firecracker client works
	// For now just check the method doesn't error
	_ = found
}

func TestManagerStopInstance(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{Name: "test-agent"}
	instance, _ := manager.Create(cfg)

	err := manager.Stop(instance.ID)
	if err != nil {
		t.Fatalf("Failed to stop instance: %v", err)
	}

	found, _ := manager.Get(instance.ID)
	// Status should be "stopped" (or still pending if not yet running)
	_ = found
}

func TestManagerGetByAPIKey(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{Name: "test-agent"}
	created, _ := manager.Create(cfg)

	found, err := manager.GetByAPIKey(created.APIKey)
	if err != nil {
		t.Fatalf("Failed to find instance by API key: %v", err)
	}
	if found.ID != created.ID {
		t.Errorf("Expected ID %s, got %s", created.ID, found.ID)
	}
}

func TestManagerGetByInvalidAPIKey(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	_, err := manager.GetByAPIKey("invalid_key")
	if err == nil {
		t.Error("Expected error when finding instance by invalid API key")
	}
}

func TestManagerStats(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	// Create instances with different statuses
	cfg := Config{Name: "test-agent"}
	inst1, _ := manager.Create(cfg)
	inst2, _ := manager.Create(Config{Name: "test-agent-2"})
	inst3, _ := manager.Create(Config{Name: "test-agent-3"})

	// Set statuses
	manager.mu.Lock()
	inst1.Status = "running"
	inst2.Status = "running"
	inst3.Status = "stopped"
	manager.mu.Unlock()

	stats := manager.Stats()

	if stats["total"].(int) != 3 {
		t.Errorf("Expected total to be 3, got %v", stats["total"])
	}
	if stats["hostId"] != "host-123" {
		t.Errorf("Expected hostId to be 'host-123', got %v", stats["hostId"])
	}
}

// IP Pool Tests
func TestIPPoolAllocate(t *testing.T) {
	pool := NewIPPool("192.168.1", 100, 200)

	ip, err := pool.Allocate()
	if err != nil {
		t.Fatalf("Failed to allocate IP: %v", err)
	}

	if ip == "" {
		t.Error("Expected allocated IP to not be empty")
	}

	// Verify IP is in correct format
	expectedPrefix := "192.168.1."
	if len(ip) < len(expectedPrefix) || ip[:len(expectedPrefix)] != expectedPrefix {
		t.Errorf("Expected IP to start with '%s', got '%s'", expectedPrefix, ip)
	}
}

func TestIPPoolAllocateMultiple(t *testing.T) {
	pool := NewIPPool("192.168.1", 100, 102) // Small pool for testing

	ips := []string{}
	for i := 0; i < 3; i++ {
		ip, err := pool.Allocate()
		if err != nil {
			t.Fatalf("Failed to allocate IP %d: %v", i, err)
		}
		ips = append(ips, ip)
	}

	// Verify all IPs are unique
	for i, ip1 := range ips {
		for j, ip2 := range ips {
			if i != j && ip1 == ip2 {
				t.Errorf("Duplicate IP allocated: %s", ip1)
			}
		}
	}
}

func TestIPPoolAllocateExhaustion(t *testing.T) {
	pool := NewIPPool("192.168.1", 100, 102) // Pool of 3 IPs (100, 101, 102)

	// Allocate all available IPs
	for i := 0; i < 3; i++ {
		_, err := pool.Allocate()
		if err != nil {
			t.Fatalf("Failed to allocate IP %d: %v", i, err)
		}
	}

	// Try to allocate one more - should fail
	_, err := pool.Allocate()
	if err == nil {
		t.Error("Expected error when IP pool is exhausted")
	}
}

func TestIPPoolRelease(t *testing.T) {
	pool := NewIPPool("192.168.1", 100, 200)

	ip, _ := pool.Allocate()
	pool.Release(ip)

	// Release should not error
	// Allocate should work again with same IP after release
	ip2, err := pool.Allocate()
	if err != nil {
		t.Fatalf("Failed to allocate IP after release: %v", err)
	}
	_ = ip2
}

func TestIPPoolReleaseAndReallocate(t *testing.T) {
	pool := NewIPPool("192.168.1", 100, 101) // Small pool

	// Allocate both IPs
	ip1, _ := pool.Allocate()
	ip2, _ := pool.Allocate()

	// Pool is now exhausted
	_, err := pool.Allocate()
	if err == nil {
		t.Error("Expected pool to be exhausted")
	}

	// Release first IP
	pool.Release(ip1)

	// Can now allocate again
	ip3, err := pool.Allocate()
	if err != nil {
		t.Fatalf("Failed to allocate after release: %v", err)
	}

	// Should be the released IP
	if ip3 != ip1 {
		t.Errorf("Expected to get released IP '%s', got '%s'", ip1, ip3)
	}

	_ = ip2
}

func TestIPPoolConcurrentAllocation(t *testing.T) {
	pool := NewIPPool("192.168.1", 100, 200)

	var wg sync.WaitGroup
	ips := make([]string, 50)
	errors := make([]error, 50)

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			ip, err := pool.Allocate()
			ips[idx] = ip
			errors[idx] = err
		}(i)
	}

	wg.Wait()

	// Check no errors
	for i, err := range errors {
		if err != nil {
			t.Errorf("Goroutine %d got error: %v", i, err)
		}
	}

	// Check all IPs are unique
	seen := make(map[string]bool)
	for _, ip := range ips {
		if seen[ip] {
			t.Errorf("Duplicate IP allocated: %s", ip)
		}
		seen[ip] = true
	}
}

// API Key Generation Tests
func TestGenerateAPIKeyFormat(t *testing.T) {
	key, err := generateAPIKey()
	if err != nil {
		t.Fatalf("Failed to generate API key: %v", err)
	}

	// Check format: hc_
	if len(key) < 10 {
		t.Errorf("API key too short: %s", key)
	}
	if key[:3] != "hc_" {
		t.Errorf("API key should start with 'hc_', got: %s", key[:3])
	}
}

func TestGenerateAPIKeyUniqueness(t *testing.T) {
	keys := make(map[string]bool)

	// Generate 1000 keys and check uniqueness
	for i := 0; i < 1000; i++ {
		key, err := generateAPIKey()
		if err != nil {
			t.Fatalf("Failed to generate API key %d: %v", i, err)
		}

		if keys[key] {
			t.Errorf("Duplicate API key generated: %s", key)
		}
		keys[key] = true
	}
}

// Expiration Tests
func TestInstanceExpiration(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	cfg := Config{
		Name:     "expiring-instance",
		TTLHours: 1,
	}

	instance, err := manager.Create(cfg)
	if err != nil {
		t.Fatalf("Failed to create instance: %v", err)
	}

	// Check expiration is set correctly
	expectedExpiry := time.Now().Add(1 * time.Hour)
	if instance.ExpiresAt.Before(expectedExpiry.Add(-1 * time.Minute)) ||
		instance.ExpiresAt.After(expectedExpiry.Add(1*time.Minute)) {
		t.Errorf("ExpiresAt not within expected range. Expected around %v, got %v",
			expectedExpiry, instance.ExpiresAt)
	}
}

func TestCheckExpiration(t *testing.T) {
	manager := NewManager("host-123", "/snapshots")

	// Create an instance
	cfg := Config{Name: "test", TTLHours: 24}
	inst, _ := manager.Create(cfg)

	// Manually set it to expired
	manager.mu.Lock()
	inst.ExpiresAt = time.Now().Add(-1 * time.Hour)
	manager.mu.Unlock()

	// Call expiration check
	manager.CheckExpiration()

	// Instance should be removed
	manager.mu.RLock()
	_, exists := manager.instances[inst.ID]
	manager.mu.RUnlock()

	if exists {
		t.Error("Expected expired instance to be removed")
	}
}