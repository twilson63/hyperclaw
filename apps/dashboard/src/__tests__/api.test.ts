import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchInstances,
  fetchInstance,
  fetchStats,
  createInstance,
  startInstance,
  stopInstance,
  deleteInstance,
  authApi,
  instancesApi,
  statsApi,
} from '../lib/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API Client', () => {
  const API_BASE = 'http://localhost:3000';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchInstances', () => {
    test('should fetch instances successfully', async () => {
      const mockInstances = [
        { id: 'inst-1', name: 'agent-1', status: 'running' },
        { id: 'inst-2', name: 'agent-2', status: 'pending' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instances: mockInstances }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await fetchInstances();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual(mockInstances);
    });

    test('should return empty array when no instances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instances: [] }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await fetchInstances();

      expect(result).toEqual([]);
    });

    test('should throw error on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      localStorageMock.setItem('hyperclaw_token', 'invalid-token');

      await expect(fetchInstances()).rejects.toThrow();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hyperclaw-token');
    });

    test('should throw error with message on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(fetchInstances()).rejects.toThrow('Internal server error');
    });

    test('should use fallback token key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instances: [] }),
      });

      // Set token with alternate key
      localStorageMock.setItem('hyperclaw-token', 'alt-token');

      await fetchInstances();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer alt-token',
          }),
        })
      );
    });
  });

  describe('fetchInstance', () => {
    test('should fetch single instance by ID', async () => {
      const mockInstance = { id: 'inst-123', name: 'my-agent', status: 'running' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instance: mockInstance }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await fetchInstance('inst-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances/inst-123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual(mockInstance);
    });

    test('should create instance - returns raw response', async () => {
      const mockInstance = {
        id: 'inst-new',
        name: 'new-agent',
        status: 'pending',
        model: 'qwen3.5',
        ramGb: 16,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ instance: mockInstance }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await createInstance({
        name: 'new-agent',
        model: 'qwen3.5',
        ramGb: 16,
        ttlSeconds: 3600,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'new-agent',
            model: 'qwen3.5',
            ramGb: 16,
            ttlSeconds: 3600,
          }),
        })
      );
      // createInstance returns the raw response { instance: {...} }
      expect(result).toHaveProperty('instance');
    });

    test('should throw on instance not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Instance not found' }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(fetchInstance('nonexistent')).rejects.toThrow('Instance not found');
    });
  });

  describe('fetchStats', () => {
    test('should fetch platform statistics', async () => {
      const mockApiResponse = {
        instances: { total: 10, running: 7, pending: 2, stopped: 1 },
        users: { total: 25 },
        resources: {
          totalRamGb: 160,
          byModel: [{ model: 'qwen3.5', count: 5 }],
        },
        usage: { hours: 48, monthlyCost: 7.68 },
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await fetchStats();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/stats`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );

      // Should transform to dashboard Stats format
      expect(result.totalInstances).toBe(10);
      expect(result.activeInstances).toBe(7);
      expect(result.totalHours).toBe(48);
      expect(result.monthlyCost).toBe(7.68);
      expect(result.ramUsage).toBe(160);
    });

    test('should handle stats errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database error' }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(fetchStats()).rejects.toThrow('Database error');
    });
  });

  describe('createInstance', () => {
    test('should create instance with valid input', async () => {
      const mockInstance = {
        id: 'inst-new',
        name: 'new-agent',
        status: 'pending',
        model: 'qwen3.5',
        ramGb: 16,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ instance: mockInstance }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await createInstance({
        name: 'new-agent',
        model: 'qwen3.5',
        ramGb: 16,
        ttlSeconds: 3600,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'new-agent',
            model: 'qwen3.5',
            ramGb: 16,
            ttlSeconds: 3600,
          }),
        })
      );
      // createInstance returns the whole response body { instance: {...} }
      // The return type is Instance but the raw JSON is returned
      // For testing, we check the structure contains instance
      expect((result as any).instance).toBeDefined();
      expect((result as any).instance.name).toBe('new-agent');
    });

    test('should handle validation errors from server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid ramGb value', code: 'VALIDATION_ERROR' }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(
        createInstance({ name: 'test', model: 'qwen3.5', ramGb: 500, ttlSeconds: 3600 })
      ).rejects.toThrow('Invalid ramGb value');
    });

    test('should handle plan limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: 'Plan limit reached. Your free plan allows 1 concurrent instances.',
          code: 'CONFLICT',
        }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(createInstance({ name: 'test', model: 'qwen3.5', ramGb: 16, ttlSeconds: 3600 })).rejects.toThrow(
        'Plan limit reached'
      );
    });
  });

  describe('startInstance', () => {
    test('should start instance successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instance: { id: 'inst-123', status: 'running' } }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await startInstance('inst-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances/inst-123/start`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('stopInstance', () => {
    test('should stop instance successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instance: { id: 'inst-123', status: 'stopped' } }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await stopInstance('inst-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances/inst-123/stop`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('deleteInstance', () => {
    test('should delete instance successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await deleteInstance('inst-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/instances/inst-123`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    test('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Instance not found' }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(deleteInstance('nonexistent')).rejects.toThrow('Instance not found');
    });
  });

  describe('authApi', () => {
    test('login should authenticate and return user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 'user-1', email: 'test@example.com', plan: 'pro' },
            token: 'auth-token',
          }),
      });

      const result = await authApi.login('test@example.com', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      );
      expect(result.user).toEqual({ id: 'user-1', email: 'test@example.com', plan: 'pro' });
    });

    test('register should create new user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 'new-user', email: 'new@example.com', plan: 'free' },
            token: 'new-token',
          }),
      });

      const result = await authApi.register('new@example.com', 'password123', 'Test User');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com', password: 'password123', name: 'Test User' }),
        })
      );
      expect(result.user.email).toBe('new@example.com');
    });

    test('session should return current user', async () => {
      localStorageMock.setItem('hyperclaw_token', 'session-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 'user-1', email: 'active@example.com', plan: 'pro' },
          }),
      });

      const result = await authApi.session();

      expect(mockFetch).toHaveBeenCalled();
      // session returns the user object from the response
      expect(result).toBeDefined();
    });
  });

  describe('instancesApi', () => {
    test('should expose correct methods', () => {
      expect(typeof instancesApi.getAll).toBe('function');
      expect(typeof instancesApi.getById).toBe('function');
      expect(typeof instancesApi.create).toBe('function');
      expect(typeof instancesApi.start).toBe('function');
      expect(typeof instancesApi.stop).toBe('function');
      expect(typeof instancesApi.delete).toBe('function');
    });

    test('getAll should call fetchInstances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ instances: [] }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await instancesApi.getAll();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('statsApi', () => {
    test('should expose getStats method', () => {
      expect(typeof statsApi.getStats).toBe('function');
    });

    test('getStats should call fetchStats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            instances: { total: 5, running: 3, pending: 1, stopped: 1 },
            users: { total: 10 },
            resources: { totalRamGb: 80, byModel: [] },
            usage: { hours: 24, monthlyCost: 1.92 },
          }),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      const result = await statsApi.getStats();

      expect(result).toHaveProperty('totalInstances');
      expect(result).toHaveProperty('activeInstances');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(fetchInstances()).rejects.toThrow();
    });

    test('should handle network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(fetchInstances()).rejects.toThrow('Network failure');
    });

    test('should use default error message on unknown errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      localStorageMock.setItem('hyperclaw_token', 'test-token');

      await expect(fetchInstances()).rejects.toThrow('API Error');
    });
  });
});