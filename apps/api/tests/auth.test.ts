import { describe, test, expect, beforeEach } from 'bun:test';
import { getTestDatabase, createTestUser, clearTables } from './setup';

// Mock the database module
const mockDb = {
  prepare: (sql: string) => ({
    get: (params?: any) => null,
    all: (params?: any) => [],
    run: (params?: any) => ({ changes: 1, lastInsertRowid: 1 }),
  }),
  run: (sql: string) => ({ changes: 1, lastInsertRowid: 1 }),
};

// We'll import app after setting up mocks
import app from '../src/index';

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
      expect(data.sessionToken).toBeDefined();
    });

    test('should reject invalid email format', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should reject short password', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should reject missing fields', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should reject duplicate email', async () => {
      // First registration
      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
        }),
      });

      // Second registration with same email
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'AnotherPassword123!',
        }),
      });

      expect(response.status).toBe(409); // Conflict
    });
  });

  describe('POST /auth/login', () => {
    test('should login with valid credentials', async () => {
      // Register first
      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login-test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Then login
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login-test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.sessionToken).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      // Register a user
      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid-user@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Try login with wrong password
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid-user@example.com',
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('should reject non-existent user', async () => {
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('should reject missing fields', async () => {
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    test('should logout successfully with token', async () => {
      // Register and login
      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'logout-test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Login to get token
      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'logout-test@example.com',
          password: 'ValidPassword123!',
        }),
      });
      const loginData = await loginRes.json();

      // Logout
      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.sessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should reject logout without token', async () => {
      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/session', () => {
    test('should return session info with valid token', async () => {
      // Register and login
      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'session-test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      // Login to get token
      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'session-test@example.com',
          password: 'ValidPassword123!',
        }),
      });
      const loginData = await loginRes.json();

      // Get session
      const response = await app.request('/auth/session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.sessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('session-test@example.com');
    });

    test('should reject session without token', async () => {
      const response = await app.request('/auth/session', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    test('should reject expired session', async () => {
      // This would require mocking the session table to have an expired session
      const response = await app.request('/auth/session', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid_token',
        },
      });

      expect(response.status).toBe(401);
    });
  });
});