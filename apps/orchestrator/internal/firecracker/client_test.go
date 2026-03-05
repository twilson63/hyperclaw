package firecracker

import (
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	t.Run("should create client with socket path and base URL", func(t *testing.T) {
		socketPath := "/run/firecracker.sock"
		baseURL := "http://localhost"

		client := NewClient(socketPath, baseURL)

		if client == nil {
			t.Fatal("Expected client to be created, got nil")
		}
		if client.socketPath != socketPath {
			t.Errorf("Expected socketPath '%s', got '%s'", socketPath, client.socketPath)
		}
		if client.baseURL != baseURL {
			t.Errorf("Expected baseURL '%s', got '%s'", baseURL, client.baseURL)
		}
	})
}

func TestClient_CreateVM(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should create VM and return status", func(t *testing.T) {
		cfg := VMConfig{
			ID:         "test-vm-001",
			KernelPath: "/snapshots/vmlinux",
			RootfsPath: "/snapshots/rootfs-qwen3.5.ext4",
			MemoryMB:   8192,
			VcpuCount:  4,
			SerialSock: "/tmp/firecracker-test-vm-001.sock",
		}

		status, err := client.CreateVM(cfg)
		if err != nil {
			t.Fatalf("Failed to create VM: %v", err)
		}
		if status == nil {
			t.Fatal("Expected status, got nil")
		}

		if status.ID != cfg.ID {
			t.Errorf("Expected ID '%s', got '%s'", cfg.ID, status.ID)
		}
		if status.State != "Running" {
			t.Errorf("Expected state 'Running', got '%s'", status.State)
		}
		if status.CreatedAt.IsZero() {
			t.Error("Expected CreatedAt to be set")
		}
		if time.Since(status.CreatedAt) > time.Second {
			t.Errorf("CreatedAt should be recent")
		}
	})

	t.Run("should create multiple VMs with different IDs", func(t *testing.T) {
		cfg1 := VMConfig{ID: "vm-1", MemoryMB: 4096}
		cfg2 := VMConfig{ID: "vm-2", MemoryMB: 8192}

		status1, err1 := client.CreateVM(cfg1)
		status2, err2 := client.CreateVM(cfg2)

		if err1 != nil {
			t.Fatalf("Failed to create VM 1: %v", err1)
		}
		if err2 != nil {
			t.Fatalf("Failed to create VM 2: %v", err2)
		}
		if status1.ID != "vm-1" {
			t.Errorf("Expected ID 'vm-1', got '%s'", status1.ID)
		}
		if status2.ID != "vm-2" {
			t.Errorf("Expected ID 'vm-2', got '%s'", status2.ID)
		}
	})
}

func TestClient_StopVM(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should stop VM successfully", func(t *testing.T) {
		err := client.StopVM("test-vm-001")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
	})

	t.Run("should handle stop for non-existent VM", func(t *testing.T) {
		// Current mock implementation always succeeds
		err := client.StopVM("non-existent-vm")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
	})
}

func TestClient_StartVM(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should start VM successfully", func(t *testing.T) {
		err := client.StartVM("test-vm-001")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
	})

	t.Run("should handle start for non-existent VM", func(t *testing.T) {
		err := client.StartVM("non-existent-vm")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
	})
}

func TestClient_GetVMStatus(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should return VM status", func(t *testing.T) {
		status, err := client.GetVMStatus("test-vm-001")
		if err != nil {
			t.Fatalf("Failed to get VM status: %v", err)
		}

		if status.ID != "test-vm-001" {
			t.Errorf("Expected ID 'test-vm-001', got '%s'", status.ID)
		}
		if status.State != "Running" {
			t.Errorf("Expected state 'Running', got '%s'", status.State)
		}
		if status.CreatedAt.IsZero() {
			t.Error("Expected CreatedAt to be set")
		}
	})
}

func TestClient_PauseVM(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should pause VM successfully", func(t *testing.T) {
		err := client.PauseVM("test-vm-001")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
	})
}

func TestClient_CreateSnapshot(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should create snapshot successfully", func(t *testing.T) {
		err := client.CreateSnapshot("test-vm-001", "/snapshots/test.snap")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}
	})
}

func TestClient_LoadSnapshot(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should load snapshot and return status", func(t *testing.T) {
		status, err := client.LoadSnapshot("test-vm-001", "/snapshots/test.snap")
		if err != nil {
			t.Fatalf("Failed to load snapshot: %v", err)
		}

		if status.ID != "test-vm-001" {
			t.Errorf("Expected ID 'test-vm-001', got '%s'", status.ID)
		}
		if status.State != "Running" {
			t.Errorf("Expected state 'Running', got '%s'", status.State)
		}
	})
}

func TestClient_ConnectSerial(t *testing.T) {
	client := NewClient("/run/firecracker.sock", "http://localhost")

	t.Run("should return error for unimplemented serial connection", func(t *testing.T) {
		_, err := client.ConnectSerial("test-vm-001")
		if err == nil {
			t.Error("Expected error for unimplemented serial connection")
		}
		if err != nil && err.Error() != "serial connection not implemented" {
			t.Errorf("Expected 'not implemented' error, got: %v", err)
		}
	})
}

// Integration tests would require actual Firecracker environment
// These are marked as skipped to avoid failures in CI

func TestClient_Integration(t *testing.T) {
	t.Skip("Integration tests require actual Firecracker environment")

	// Real Firecracker tests would go here:
	// 1. Start Firecracker daemon
	// 2. Create actual VM
	// 3. Verify VM is running
	// 4. Connect via serial console
	// 5. Stop and clean up
}