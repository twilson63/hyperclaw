package firecracker

import (
	"fmt"
	"time"
)

// VMConfig represents Firecracker VM configuration
type VMConfig struct {
	ID         string `json:"id"`
	KernelPath string `json:"kernelPath"`
	RootfsPath string `json:"rootfsPath"`
	MemoryMB   int    `json:"memoryMb"`
	VcpuCount  int    `json:"vcpuCount"`
	SerialSock string `json:"serialSocket"`
}

// VMStatus represents the status of a Firecracker VM
type VMStatus struct {
	ID        string    `json:"id"`
	State     string    `json:"state"` // Running, Paused, NotStarted
	CreatedAt time.Time `json:"createdAt"`
}

// Client is a Firecracker API client
type Client struct {
	socketPath string
	baseURL    string
}

// NewClient creates a new Firecracker client
func NewClient(socketPath, baseURL string) *Client {
	return &Client{
		socketPath: socketPath,
		baseURL:    baseURL,
	}
}

// CreateVM creates a new Firecracker VM
func (c *Client) CreateVM(cfg VMConfig) (*VMStatus, error) {
	// TODO: Call actual Firecracker API
	// For development, return mock status
	return &VMStatus{
		ID:        cfg.ID,
		State:     "Running",
		CreatedAt: time.Now(),
	}, nil
}

// StopVM stops a Firecracker VM
func (c *Client) StopVM(id string) error {
	// TODO: Call actual Firecracker API
	return nil
}

// GetVMStatus gets the status of a Firecracker VM
func (c *Client) GetVMStatus(id string) (*VMStatus, error) {
	// TODO: Call actual Firecracker API
	return &VMStatus{
		ID:        id,
		State:     "Running",
		CreatedAt: time.Now(),
	}, nil
}

// StartVM starts a paused or stopped VM
func (c *Client) StartVM(id string) error {
	// TODO: Call actual Firecracker API
	return nil
}

// PauseVM pauses a running VM
func (c *Client) PauseVM(id string) error {
	// TODO: Call actual Firecracker API
	return nil
}

// CreateSnapshot creates a snapshot of a running VM
func (c *Client) CreateSnapshot(id, snapshotPath string) error {
	// TODO: Call actual Firecracker API
	return nil
}

// LoadSnapshot loads a VM from a snapshot
func (c *Client) LoadSnapshot(id, snapshotPath string) (*VMStatus, error) {
	// TODO: Call actual Firecracker API
	return &VMStatus{
		ID:        id,
		State:     "Running",
		CreatedAt: time.Now(),
	}, nil
}

// ConnectSerial connects to the VM's serial console
func (c *Client) ConnectSerial(id string) (interface{}, error) {
	// TODO: Return actual serial connection
	return nil, fmt.Errorf("serial connection not implemented")
}