// HyperClaw API Client
import type { Instance, Stats, CreateInstanceInput } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  // Try both token keys for compatibility
  return localStorage.getItem('hyperclaw_token') || localStorage.getItem('hyperclaw-token');
}

/**
 * Build headers with optional auth
 */
function buildHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * Handle API response with 401 redirect
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem('hyperclaw-token');
    localStorage.removeItem('hyperclaw-auth');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `API Error: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Auth API endpoints
 */
export const authApi = {
  async login(email: string, password: string): Promise<{ user: import('../types').User; token: string }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: buildHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  async register(email: string, password: string, name?: string): Promise<{ user: import('../types').User; token: string }> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: buildHeaders(false),
      body: JSON.stringify({ email, password, name }),
    });
    return handleResponse(response);
  },

  async session(): Promise<import('../types').User> {
    const response = await fetch(`${API_BASE}/auth/session`, {
      headers: buildHeaders(),
    });
    return handleResponse(response);
  },
};

export async function fetchInstances(): Promise<Instance[]> {
  const response = await fetch(`${API_BASE}/instances`, {
    headers: buildHeaders(),
  });
  const data = await handleResponse<{ instances: Instance[] }>(response);
  return data.instances;
}

export async function fetchInstance(id: string): Promise<Instance> {
  const response = await fetch(`${API_BASE}/instances/${id}`, {
    headers: buildHeaders(),
  });
  const data = await handleResponse<{ instance: Instance }>(response);
  return data.instance;
}

export async function fetchStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE}/stats`, {
    headers: buildHeaders(),
  });
  const data = await handleResponse<{
    instances: { total: number; running: number; pending: number; stopped: number };
    users: { total: number };
    resources: { totalRamGb: number; byModel: { model: string; count: number }[] };
    usage: { hours: number; monthlyCost: number };
    timestamp: string;
  }>(response);
  
  // Transform to match dashboard Stats type
  return {
    totalInstances: data.instances.total,
    activeInstances: data.instances.running,
    totalHours: data.usage.hours,
    monthlyCost: data.usage.monthlyCost,
    ramUsage: data.resources.totalRamGb,
  };
}

export async function startInstance(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/instances/${id}/start`, {
    method: 'POST',
    headers: buildHeaders(),
  });
  await handleResponse<void>(response);
}

export async function stopInstance(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/instances/${id}/stop`, {
    method: 'POST',
    headers: buildHeaders(),
  });
  await handleResponse<void>(response);
}

export async function deleteInstance(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/instances/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  await handleResponse<void>(response);
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const response = await fetch(`${API_BASE}/instances`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<Instance>(response);
}

// API object exports for use with TanStack Query
export const instancesApi = {
  getAll: fetchInstances,
  getById: fetchInstance,
  create: createInstance,
  start: startInstance,
  stop: stopInstance,
  delete: deleteInstance,
};

export const statsApi = {
  getStats: fetchStats,
};