import { generateId } from '../utils/crypto.js';

export interface InstanceConfig {
  id: string;
  userId: string;
  model: string;
  ramGb: number;
}

export interface CreateInstanceResult {
  id: string;
  status: 'running' | 'pending' | 'failed';
  endpoint?: string;
  hostId?: string;
  error?: string;
}

// Stub orchestrator - simulates VM creation
// In production, this would call the Go/Rust orchestrator service
export async function createInstance(config: InstanceConfig): Promise<CreateInstanceResult> {
  // Simulate network latency and VM boot time
  const bootTimeMs = 150 + Math.random() * 100; // 150-250ms
  await new Promise(resolve => setTimeout(resolve, bootTimeMs));

  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    return {
      id: config.id,
      status: 'failed',
      error: 'Failed to allocate host resource',
    };
  }

  // Assign to a random host
  const hostId = `host-${Math.floor(Math.random() * 10) + 1}`;
  
  // Generate endpoint (in production, VM would bind to a port)
  const port = 50000 + Math.floor(Math.random() * 1000);
  const endpoint = `http://192.168.1.${Math.floor(Math.random() * 255) + 1}:${port}`;

  return {
    id: config.id,
    status: 'running',
    endpoint,
    hostId,
  };
}

export async function stopInstance(instanceId: string): Promise<{ success: boolean }> {
  // Simulate stop operation
  await new Promise(resolve => setTimeout(resolve, 50));
  return { success: true };
}

export async function startInstance(instanceId: string): Promise<CreateInstanceResult> {
  // Simulate start from stopped state
  const bootTimeMs = 100 + Math.random() * 50; // 100-150ms from stopped
  await new Promise(resolve => setTimeout(resolve, bootTimeMs));

  const port = 50000 + Math.floor(Math.random() * 1000);
  const endpoint = `http://192.168.1.${Math.floor(Math.random() * 255) + 1}:${port}`;

  return {
    id: instanceId,
    status: 'running',
    endpoint,
  };
}

export async function deleteInstance(instanceId: string): Promise<{ success: boolean }> {
  // Simulate cleanup
  await new Promise(resolve => setTimeout(resolve, 30));
  return { success: true };
}

// Host management stubs
export async function getAvailableHosts(): Promise<{ id: string; availableRamGb: number }[]> {
  // Return simulated host data
  return [
    { id: 'host-1', availableRamGb: 128 },
    { id: 'host-2', availableRamGb: 96 },
    { id: 'host-3', availableRamGb: 64 },
  ];
}

export async function getHostCapacity(): Promise<{ total: number; used: number; available: number }> {
  return {
    total: 768, // GB
    used: 288,
    available: 480,
  };
}