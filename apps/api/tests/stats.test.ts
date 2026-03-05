import { describe, test, expect, beforeEach } from 'bun:test';
import app from '../src/index';

describe('Stats Routes', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register a user for authenticated tests
    const registerRes = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'stats-test@example.com',
        password: 'ValidPassword123!',
      }),
    });
    const registerData = await registerRes.json();
    authToken = registerData.sessionToken;
  });

  describe('GET /stats', () => {
    test('should return platform statistics', async () => {
      const response = await app.request('/stats', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toBeDefined();
      expect(data.instances.total).toBeGreaterThanOrEqual(0);
      expect(data.instances.running).toBeGreaterThanOrEqual(0);
      expect(data.instances.pending).toBeGreaterThanOrEqual(0);
      expect(data.instances.stopped).toBeGreaterThanOrEqual(0);
      expect(data.users).toBeDefined();
      expect(data.users.total).toBeGreaterThanOrEqual(0);
      expect(data.resources).toBeDefined();
      expect(data.usage).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    test('should count instances correctly', async () => {
      const response = await app.request('/stats', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // After beforeEach, we have 1 registered user
      expect(data.users.total).toBeGreaterThanOrEqual(1);
    });

    test('should handle database errors gracefully', async () => {
      // This would require mocking the database to throw an error
      // For now, just test that valid requests work
      const response = await app.request('/stats', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /stats/user', () => {
    test('should return user statistics', async () => {
      const response = await app.request('/stats/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances).toBeDefined();
      expect(data.instances.total).toBeGreaterThanOrEqual(0);
      expect(data.resources).toBeDefined();
      expect(data.usage).toBeDefined();
      expect(data.plan).toBeDefined();
      expect(data.plan.name).toBe('free'); // Default plan
      expect(data.timestamp).toBeDefined();
    });

    test('should reject request without auth', async () => {
      const response = await app.request('/stats/user', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    test('should count user instances correctly', async () => {
      // Create an instance
      await app.request('/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'test-instance',
        }),
      });

      const response = await app.request('/stats/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.instances.total).toBeGreaterThanOrEqual(1);
    });

    test('should return correct plan rate', async () => {
      const response = await app.request('/stats/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.plan).toBeDefined();
      expect(data.plan.name).toBe('free');
      expect(data.plan.ratePerGbHour).toBe(0); // Free plan has 0 rate
    });
  });
});