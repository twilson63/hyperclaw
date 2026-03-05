import { describe, test, expect } from 'bun:test';
import app from '../src/index';

describe('Error Handling', () => {
  describe('404 Not Found', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await app.request('/unknown-route', {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('Validation Errors', () => {
    test('should return validation error for invalid email', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'ValidPassword123!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    test('should return validation error for short password', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid@example.com',
          password: 'short',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    test('should return validation error for missing fields', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authentication Errors', () => {
    test('should return 401 for protected routes without token', async () => {
      const response = await app.request('/instances', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    test('should return 401 for invalid token', async () => {
      const response = await app.request('/instances', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid_token_here',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Conflict Errors', () => {
    test('should return 409 for duplicate email', async () => {
      // First registration
      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'conflict@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Second registration with same email
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'conflict@example.com',
          password: 'AnotherPassword123!',
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe('CONFLICT');
    });
  });

  describe('Generic Errors', () => {
    test('should handle malformed JSON', async () => {
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      // Should return 400 or 500 depending on error handling
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await app.request('/health', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });
});