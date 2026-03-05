import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createInstanceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  model: z.enum(['qwen3.5', 'llama3', 'mistral']).default('qwen3.5'),
  ramGb: z.number().int().min(8).max(64).default(16),
  ttlSeconds: z.number().int().min(300).max(86400).default(3600), // 5min to 24h
});

export const instanceIdSchema = z.object({
  id: z.string().uuid('Invalid instance ID'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateInstanceInput = z.infer<typeof createInstanceSchema>;