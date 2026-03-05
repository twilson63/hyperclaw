import { beforeAll, afterAll, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test database setup
let testDb: Database | null = null;
const TEST_DB_PATH = join(__dirname, '../test-data/test.db');

// Export for use in tests
export function getTestDatabase(): Database {
  if (!testDb) {
    throw new Error('Test database not initialized');
  }
  return testDb;
}

// Schema for tests
const TEST_SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instances table
CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  allocated_ram_gb INTEGER NOT NULL,
  model TEXT NOT NULL,
  ttl_seconds INTEGER NOT NULL,
  api_key TEXT NOT NULL,
  endpoint TEXT,
  host_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON instances(user_id);
`;

// Test utilities
export interface TestUser {
  id: string;
  email: string;
  passwordHash: string;
  plan: string;
}

export interface TestSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

// Create a test user
export function createTestUser(id: string, email: string, passwordHash: string = 'hashed_password', plan: string = 'free'): TestUser {
  const db = getTestDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, plan)
    VALUES ($id, $email, $passwordHash, $plan)
  `);
  stmt.run({ $id: id, $email: email, $passwordHash: passwordHash, $plan: plan });
  return { id, email, passwordHash, plan };
}

// Create a test session
export function createTestSession(id: string, userId: string, token: string, expiresAt: Date): TestSession {
  const db = getTestDatabase();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES ($id, $userId, $token, $expiresAt)
  `);
  stmt.run({ $id: id, $userId: userId, $token: token, $expiresAt: expiresAt.toISOString() });
  return { id, userId, token, expiresAt };
}

// Create a test instance
export interface TestInstance {
  id: string;
  userId: string;
  name: string;
  status: string;
  model: string;
  ramGb: number;
}

export function createTestInstance(data: {
  id: string;
  userId: string;
  name: string;
  model?: string;
  ramGb?: number;
  status?: string;
  ttlSeconds?: number;
  apiKey?: string;
  expiresAt?: Date;
}): TestInstance {
  const db = getTestDatabase();
  const model = data.model || 'qwen3.5';
  const ramGb = data.ramGb || 8;
  const status = data.status || 'pending';
  const ttlSeconds = data.ttlSeconds || 3600;
  const apiKey = data.apiKey || 'test_api_key';
  const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO instances (id, user_id, name, status, allocated_ram_gb, model, ttl_seconds, api_key, expires_at)
    VALUES ($id, $userId, $name, $status, $ramGb, $model, $ttlSeconds, $apiKey, $expiresAt)
  `);
  stmt.run({
    $id: data.id,
    $userId: data.userId,
    $name: data.name,
    $status: status,
    $ramGb: ramGb,
    $model: model,
    $ttlSeconds: ttlSeconds,
    $apiKey: apiKey,
    $expiresAt: expiresAt.toISOString(),
  });

  return { id: data.id, userId: data.userId, name: data.name, status, model, ramGb };
}

// Clear all tables
export function clearTables() {
  const db = getTestDatabase();
  db.run('DELETE FROM sessions');
  db.run('DELETE FROM instances');
  db.run('DELETE FROM users');
}

beforeAll(() => {
  // Create test data directory
  const testDir = join(__dirname, '../test-data');
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }

  // Create test database
  testDb = new Database(TEST_DB_PATH);
  testDb.run('PRAGMA journal_mode = WAL');
  testDb.run(TEST_SCHEMA);
});

afterAll(() => {
  if (testDb) {
    testDb.close();
    testDb = null;
  }

  // Clean up test database
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH, { force: true });
  }
  
  // Clean up WAL files
  const walPath = TEST_DB_PATH + '-wal';
  const shmPath = TEST_DB_PATH + '-shm';
  if (existsSync(walPath)) rmSync(walPath, { force: true });
  if (existsSync(shmPath)) rmSync(shmPath, { force: true });
});

beforeEach(() => {
  clearTables();
  // Reset env variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = TEST_DB_PATH;
});