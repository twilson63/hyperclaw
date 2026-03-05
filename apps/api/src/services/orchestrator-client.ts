/**
 * Orchestrator Client - Proxies requests to the Go Orchestrator service
 */

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8080';

// Types matching the Go orchestrator
export interface OrchestratorInstance {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'stopped' | 'error';
  model: string;
  ramGb: number;
  hostId: string;
  apiKey: string;
  endpoint: string;
  serialSocket: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string;
  machineId: string;
  snapshotId: string;
}

export interface OrchestratorConfig {
  name: string;
  model: string;
  ramGb: number;
  ttlHours?: number;
  snapshotId?: string;
}

export interface CreateInstanceResponse {
  instance: OrchestratorInstance;
}

export interface ListInstancesResponse {
  instances: OrchestratorInstance[];
}

export interface OrchestratorStats {
  total: number;
  running: number;
  pending: number;
  stopped: number;
  totalRam: number;
  hostId: string;
}

class OrchestratorError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

async function orchestratorFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ORCHESTRATOR_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new OrchestratorError(
        errorText || `Orchestrator error: ${response.status}`,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof OrchestratorError) {
      throw error;
    }
    throw new OrchestratorError(
      `Failed to connect to orchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`,
      503,
      'ORCHESTRATOR_UNAVAILABLE'
    );
  }
}

/**
 * Create a new instance in the orchestrator
 */
export async function createInstance(config: OrchestratorConfig): Promise<CreateInstanceResponse> {
  return orchestratorFetch<CreateInstanceResponse>('/api/v1/instances', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/**
 * List all instances in the orchestrator
 */
export async function listInstances(): Promise<ListInstancesResponse> {
  return orchestratorFetch<ListInstancesResponse>('/api/v1/instances');
}

/**
 * Get a specific instance by ID
 */
export async function getInstance(id: string): Promise<{ instance: OrchestratorInstance }> {
  return orchestratorFetch<{ instance: OrchestratorInstance }>(`/api/v1/instances/${id}`);
}

/**
 * Delete an instance
 */
export async function deleteInstance(id: string): Promise<{ status: string }> {
  return orchestratorFetch<{ status: string }>(`/api/v1/instances/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Start a stopped instance
 */
export async function startInstance(id: string): Promise<{ instance: OrchestratorInstance }> {
  return orchestratorFetch<{ instance: OrchestratorInstance }>(`/api/v1/instances/${id}/start`, {
    method: 'POST',
  });
}

/**
 * Stop a running instance
 */
export async function stopInstance(id: string): Promise<{ instance: OrchestratorInstance }> {
  return orchestratorFetch<{ instance: OrchestratorInstance }>(`/api/v1/instances/${id}/stop`, {
    method: 'POST',
  });
}

/**
 * Get orchestrator stats
 */
export async function getStats(): Promise<OrchestratorStats> {
  return orchestratorFetch<OrchestratorStats>('/api/v1/stats');
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; type: string }> {
  return orchestratorFetch<{ status: string; type: string }>('/health');
}

/**
 * Get the WebSocket URL for an instance's console
 */
export function getConsoleWsUrl(instanceId: string): string {
  const url = new URL(`${ORCHESTRATOR_URL}/api/v1/instances/${instanceId}/console`);
  // Convert http(s) to ws(s)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export { OrchestratorError };