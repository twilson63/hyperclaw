import { describe, test, expect, beforeEach } from 'bun:test';
import { getTestDatabase, createTestUser, createTestSession, createTestInstance, clearTables } from './setup';

// Mock orchestrator client
const mockOrchestrator = {
  createInstance: async (config: any) => ({
    instance: {
      id: 'test-instance-id',
      name: config.name || 'test-instance',
      status: 'running',
      model: config.model || 'qwen3.5',
      ramGb: config.ramGb || 8,
      apiKey: 'test_api_key_' + Date.now(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endpoint: 'http://192.168.1.100:50390',
      hostId: 'host-001',
    },
  }),
  deleteInstance: async (id: string) => ({ success: true }),
  startInstance: async (id: string) => ({
    instance: {
      id,
      status: 'running',
      endpoint: 'http://192.168.1.100:50390',
    },
  }),
  stopInstance: async (id: string) => ({
    instance: {
      id,
      status: 'stopped',
    },
  }),
};

// We'll use Hono app directly
import app from '../src/index';

describe('Instance Routes', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    clearTables();
    
    // Create a test user and get auth token
    const registerRes = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'instances-test@example.com',
        password: 'ValidPassword123!',
      }),
    });
    const registerData = await registerRes.json();
    authToken = registerData.sessionToken;
    userId = registerData.user.id;
  });

  describe('GET /instances', () => {
    test('should return empty list when no instances', async () => {
      const response = await app.request('/instances', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toEqual([]);
    });

    test('should return user instances', async () => {
      // Create an instance first
      await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'test-instance',
          model: 'qwen3.5',
          ramGb: 8,
          ttlSeconds: 3600,
        }),
      });

      const response = await app.request('/instances', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances.length).toBe(1);
      expect(data.instances[0].name).toBe('test-instance');
    });

    test('should not return other user instances', async () => {
      // Create instance with first user
      await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'user1-instance',
          model: 'qwen3.5',
          ramGb: 8,
          ttlSeconds: 3600,
        }),
      });

      // Create second user
      const register2Res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user2@example.com',
          password: 'ValidPassword123!',
        }),
      });
      const register2Data = await register2Res.json();
      const user2Token = register2Data.sessionToken;

      // User 2 should see empty list
      const response = await app.request('/instances', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user2Token}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances.length).toBe(0);
    });

    test('should reject request without auth', async () => {
      const response = await app.request('/instances', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /instances', () => {
    test('should create instance successfully', async () => {
      const response = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'new-instance',
          model: 'qwen3.5',
          ramGb: 8,
          ttlSeconds: 3600,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.instance).toBeDefined();
      expect(data.instance.name).toBe('new-instance');
      expect(data.instance.status).toBe('running');
      expect(data.instance.apiKey).toBeDefined();
    });

    test('should use default values', async () => {
      const response = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'default-instance',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.instance).toBeDefined();
    });

    test('should reject instance creation without auth', async () => {
      const response = await app.request('/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'unauthorized-instance',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('should enforce plan limits for free users', async () => {
      // Free plan allows only 1 instance
      // Create first instance
      await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'first-instance',
        }),
      });

      // Try to create second instance
      const response = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'second-instance',
        }),
      });

      expect(response.status).toBe(409); // Conflict - plan limit reached
    });
  });

  describe('GET /instances/:id', () => {
    test('should return instance by ID', async () => {
      // Create an instance first
      const createRes = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'test-instance',
        }),
      });
      const createData = await createRes.json();
      const instanceId = createData.instance.id;

      const response = await app.request(`/instances/${instanceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instance).toBeDefined();
      expect(data.instance.id).toBe(instanceId);
    });

    test('should return 404 for non-existent instance', async () => {
      const response = await app.request('/instances/nonexistent-id', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should not return other user instance', async () => {
      // Create instance with first user
      const createRes = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'user1-instance',
        }),
      });
      const createData = await createRes.json();
      const instanceId = createData.instance.id;

      // Create second user
      const register2Res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user2-instance@example.com',
          password: 'ValidPassword123!',
        }),
      });
      const register2Data = await register2Res.json();
      const user2Token = register2Data.sessionToken;

      // User 2 should not see User 1's instance
      const response = await app.request(`/instances/${instanceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user2Token}`,
        },
      });

      expect(response.status).toBe(404); // Not found (not authorized, but we don't leak existence)
    });
  });

  describe('DELETE /instances/:id', () => {
    test('should delete instance successfully', async () => {
      // Create an instance
      const createRes = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'to-delete',
        }),
      });
      const createData = await createRes.json();
      const instanceId = createData.instance.id;

      // Delete it
      const response = await app.request(`/instances/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify it's deleted
      const getResponse = await app.request(`/instances/${instanceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 for non-existent instance', async () => {
      const response = await app.request('/instances/nonexistent-id', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /instances/:id/start', () => {
    test('should start stopped instance', async () => {
      // Create an instance
      const createRes = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'to-start',
        }),
      });
      const createData = await createRes.json();
      const instanceId = createData.instance.id;

      // Stop it first (would need to implement stop)
      // For now, just test starting

      const response = await app.request(`/instances/${instanceId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent instance', async () => {
      const response = await app.request('/instances/nonexistent-id/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /instances/:id/stop', () => {
    test('should stop running instance', async () => {
      // Create an instance
      const createRes = await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'to-stop',
        }),
      });
      const createData = await createRes.json();
      const instanceId = createData.instance.id;

      const response = await app.request(`/instances/${instanceId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent instance', async () => {
      const response = await app.request('/instances/nonexistent-id/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });
});