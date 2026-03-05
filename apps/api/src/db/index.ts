import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/hyperclaw.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run('PRAGMA journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database) {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  database.run(schema);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// User operations
export const users = {
  create(id: string, email: string, passwordHash: string, plan: string = 'free') {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, plan)
      VALUES ($id, $email, $password_hash, $plan)
      RETURNING *
    `);
    return stmt.get({ $id: id, $email: email, $password_hash: passwordHash, $plan: plan });
  },

  findById(id: string) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = $id');
    return stmt.get({ $id: id });
  },

  findByEmail(email: string) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = $email');
    return stmt.get({ $email: email });
  },

  updatePlan(id: string, plan: string, stripeCustomerId?: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE users SET plan = $plan, stripe_customer_id = $stripeCustomerId WHERE id = $id
    `);
    stmt.run({ $plan: plan, $stripeCustomerId: stripeCustomerId || null, $id: id });
    return this.findById(id);
  }
};

// Session operations
export const sessions = {
  create(id: string, userId: string, token: string, expiresAt: Date) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES ($id, $userId, $token, $expiresAt)
      RETURNING *
    `);
    return stmt.get({ $id: id, $userId: userId, $token: token, $expiresAt: expiresAt.toISOString() });
  },

  findByToken(token: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT s.*, u.email, u.plan, u.stripe_customer_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $token AND s.expires_at > datetime('now')
    `);
    return stmt.get({ $token: token });
  },

  deleteByToken(token: string) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sessions WHERE token = $token');
    stmt.run({ $token: token });
  },

  deleteByUserId(userId: string) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = $userId');
    stmt.run({ $userId: userId });
  }
};

// Instance operations
export const instances = {
  create(data: {
    id: string;
    userId: string;
    name: string;
    allocatedRamGb: number;
    model: string;
    ttlSeconds: number;
    apiKey: string;
    expiresAt: Date;
  }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO instances (id, user_id, name, allocated_ram_gb, model, ttl_seconds, api_key, expires_at, status)
      VALUES ($id, $userId, $name, $allocatedRamGb, $model, $ttlSeconds, $apiKey, $expiresAt, 'pending')
      RETURNING *
    `);
    return stmt.get({
      $id: data.id,
      $userId: data.userId,
      $name: data.name,
      $allocatedRamGb: data.allocatedRamGb,
      $model: data.model,
      $ttlSeconds: data.ttlSeconds,
      $apiKey: data.apiKey,
      $expiresAt: data.expiresAt.toISOString(),
    });
  },

  findById(id: string) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM instances WHERE id = $id');
    return stmt.get({ $id: id });
  },

  findByUserId(userId: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM instances WHERE user_id = $userId ORDER BY created_at DESC
    `);
    return stmt.all({ $userId: userId });
  },

  updateStatus(id: string, status: string, endpoint?: string, hostId?: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE instances SET status = $status, endpoint = $endpoint, host_id = $hostId WHERE id = $id
    `);
    stmt.run({ $status: status, $endpoint: endpoint || null, $hostId: hostId || null, $id: id });
    return this.findById(id);
  },

  delete(id: string) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM instances WHERE id = $id');
    stmt.run({ $id: id });
  },

  countByUserId(userId: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM instances WHERE user_id = $userId AND status IN ('pending', 'running')
    `);
    const result = stmt.get({ $userId: userId }) as { count: number };
    return result.count;
  }
};