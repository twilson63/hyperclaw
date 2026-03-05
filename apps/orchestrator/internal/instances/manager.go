package instances

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/hyperclaw/orchestrator/internal/firecracker"
)

// Instance represents a running Firecracker VM
type Instance struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Status     string    `json:"status"` // pending, running, stopped, error
	Model      string    `json:"model"`
	RamGB      int       `json:"ramGb"`
	HostID     string    `json:"hostId"`
	APIKey     string    `json:"apiKey"`
	Endpoint   string    `json:"endpoint"`
	SerialSock string    `json:"serialSocket"`
	CreatedAt  time.Time `json:"createdAt"`
	ExpiresAt  time.Time `json:"expiresAt"`
	IpAddress  string    `json:"ipAddress"`
	MachineID  string    `json:"machineId"`
	SnapshotID string    `json:"snapshotId"`
}

// Config for creating a new instance
type Config struct {
	Name       string `json:"name"`
	Model      string `json:"model"`
	RamGB      int    `json:"ramGb"`
	TTLHours   int    `json:"ttlHours"`
	SnapshotID string `json:"snapshotId"`
}

// Manager manages Firecracker VM instances
type Manager struct {
	mu           sync.RWMutex
	instances    map[string]*Instance
	hostID       string
	snapshotPath string
	ipPool       *IPPool
	fcClient     *firecracker.Client
	logger       *log.Logger
}

// IPPool manages IP address allocation
type IPPool struct {
	mu     sync.Mutex
	used   map[string]bool
	baseIP string // e.g., "192.168.1"
	start  int    // e.g., 100
	end    int    // e.g., 200
}

// NewIPPool creates a new IP pool
func NewIPPool(baseIP string, start, end int) *IPPool {
	return &IPPool{
		used:   make(map[string]bool),
		baseIP: baseIP,
		start:  start,
		end:    end,
	}
}

// Allocate returns an available IP address
func (p *IPPool) Allocate() (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for i := p.start; i <= p.end; i++ {
		ip := fmt.Sprintf("%s.%d", p.baseIP, i)
		if !p.used[ip] {
			p.used[ip] = true
			return ip, nil
		}
	}
	return "", fmt.Errorf("no available IP addresses")
}

// Release returns an IP address to the pool
func (p *IPPool) Release(ip string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.used, ip)
}

// NewManager creates a new instance manager
func NewManager(hostID, snapshotPath string) *Manager {
	return &Manager{
		instances:    make(map[string]*Instance),
		hostID:       hostID,
		snapshotPath: snapshotPath,
		ipPool:       NewIPPool("192.168.1", 100, 200),
		fcClient:     firecracker.NewClient("/run/firecracker.sock", "http://localhost"),
		logger:       log.Default(),
	}
}

// Create creates a new Firecracker VM instance
func (m *Manager) Create(cfg Config) (*Instance, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Generate ID and API key
	id := uuid.New().String()
	apiKey, err := generateAPIKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate API key: %w", err)
	}

	// Allocate IP
	ip, err := m.ipPool.Allocate()
	if err != nil {
		return nil, fmt.Errorf("failed to allocate IP: %w", err)
	}

	// Calculate expiration
	ttlHours := cfg.TTLHours
	if ttlHours == 0 {
		ttlHours = 24 // Default 24 hours
	}
	expiresAt := time.Now().Add(time.Duration(ttlHours) * time.Hour)

	// Default RAM
	ramGB := cfg.RamGB
	if ramGB == 0 {
		ramGB = 16
	}

	// Default model
	model := cfg.Model
	if model == "" {
		model = "qwen3.5"
	}

	// Serial socket path
	serialSock := fmt.Sprintf("/tmp/firecracker-%s.sock", id)

	// Create instance record
	instance := &Instance{
		ID:         id,
		Name:       cfg.Name,
		Status:     "pending",
		Model:      model,
		RamGB:      ramGB,
		HostID:     m.hostID,
		APIKey:     apiKey,
		Endpoint:   fmt.Sprintf("http://%s:50390", ip),
		SerialSock: serialSock,
		CreatedAt:  time.Now(),
		ExpiresAt:  expiresAt,
		IpAddress:  ip,
		MachineID:  fmt.Sprintf("vm-%s", id[:8]),
		SnapshotID: cfg.SnapshotID,
	}

	// Store instance
	m.instances[id] = instance

	// Start VM in background
	go m.startVM(instance)

	m.logger.Printf("Creating instance %s (model: %s, ram: %dGB, ip: %s)", id, model, ramGB, ip)

	return instance, nil
}

// startVM starts the Firecracker VM
func (m *Manager) startVM(instance *Instance) {
	// Create VM config
	vmConfig := firecracker.VMConfig{
		ID:         instance.ID,
		KernelPath: m.snapshotPath + "/vmlinux",
		RootfsPath: m.snapshotPath + "/rootfs-" + instance.Model + ".ext4",
		MemoryMB:   instance.RamGB * 1024,
		VcpuCount:  4,
		SerialSock: instance.SerialSock,
	}

	// Create VM via Firecracker
	_, err := m.fcClient.CreateVM(vmConfig)
	if err != nil {
		m.mu.Lock()
		instance.Status = "error"
		m.mu.Unlock()
		m.logger.Printf("Failed to start VM %s: %v", instance.ID, err)
		return
	}

	// Update status
	m.mu.Lock()
	instance.Status = "running"
	m.mu.Unlock()

	m.logger.Printf("VM %s started successfully", instance.ID)
}

// Get retrieves an instance by ID
func (m *Manager) Get(id string) (*Instance, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	instance, ok := m.instances[id]
	if !ok {
		return nil, fmt.Errorf("instance not found: %s", id)
	}
	return instance, nil
}

// List returns all instances
func (m *Manager) List() []*Instance {
	m.mu.RLock()
	defer m.mu.RUnlock()

	instances := make([]*Instance, 0, len(m.instances))
	for _, inst := range m.instances {
		instances = append(instances, inst)
	}
	return instances
}

// Delete stops and removes an instance
func (m *Manager) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	instance, ok := m.instances[id]
	if !ok {
		return fmt.Errorf("instance not found: %s", id)
	}

	// Stop VM
	if instance.Status == "running" {
		if err := m.fcClient.StopVM(instance.ID); err != nil {
			m.logger.Printf("Warning: failed to stop VM %s: %v", id, err)
		}
	}

	// Release IP
	if instance.IpAddress != "" {
		m.ipPool.Release(instance.IpAddress)
	}

	delete(m.instances, id)
	m.logger.Printf("Deleted instance %s", id)
	return nil
}

// Start starts a stopped instance
func (m *Manager) Start(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	instance, ok := m.instances[id]
	if !ok {
		return fmt.Errorf("instance not found: %s", id)
	}

	if instance.Status == "running" {
		return nil // Already running
	}

	if err := m.fcClient.StartVM(instance.ID); err != nil {
		return fmt.Errorf("failed to start VM: %w", err)
	}

	instance.Status = "running"
	m.logger.Printf("Started instance %s", id)
	return nil
}

// Stop stops a running instance
func (m *Manager) Stop(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	instance, ok := m.instances[id]
	if !ok {
		return fmt.Errorf("instance not found: %s", id)
	}

	if instance.Status != "running" {
		return nil // Not running
	}

	if err := m.fcClient.StopVM(instance.ID); err != nil {
		return fmt.Errorf("failed to stop VM: %w", err)
	}

	instance.Status = "stopped"
	m.logger.Printf("Stopped instance %s", id)
	return nil
}

// GetByAPIKey retrieves an instance by API key
func (m *Manager) GetByAPIKey(apiKey string) (*Instance, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, inst := range m.instances {
		if inst.APIKey == apiKey {
			return inst, nil
		}
	}
	return nil, fmt.Errorf("instance not found for API key")
}

// generateAPIKey creates a random API key
func generateAPIKey() (string, error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "hc_" + hex.EncodeToString(bytes), nil
}

// CheckExpiration removes expired instances
func (m *Manager) CheckExpiration() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for id, inst := range m.instances {
		if inst.ExpiresAt.Before(now) {
			// Stop and delete
			if inst.Status == "running" {
				m.fcClient.StopVM(inst.ID)
			}
			if inst.IpAddress != "" {
				m.ipPool.Release(inst.IpAddress)
			}
			delete(m.instances, id)
			m.logger.Printf("Expired instance %s removed", id)
		}
	}
}

// Stats returns instance statistics
func (m *Manager) Stats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	total := len(m.instances)
	running := 0
	pending := 0
	stopped := 0
	totalRam := 0

	for _, inst := range m.instances {
		switch inst.Status {
		case "running":
			running++
		case "pending":
			pending++
		case "stopped":
			stopped++
		}
		totalRam += inst.RamGB
	}

	return map[string]interface{}{
		"total":    total,
		"running":  running,
		"pending":  pending,
		"stopped":  stopped,
		"totalRam": totalRam,
		"hostId":   m.hostID,
	}
}

// GetListener creates a net.Listener for the serial console
func (i *Instance) GetSerialListener() (net.Listener, error) {
	return net.Listen("unix", i.SerialSock)
}