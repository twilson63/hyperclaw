import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateApiKey(): string {
  return `hc_${randomBytes(24).toString('base64url')}`;
}

export function hashPassword(password: string): string {
  // Using Bun's built-in password hashing
  return Bun.password.hashSync(password, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 2,
  });
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return Bun.password.verifySync(password, hash);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}