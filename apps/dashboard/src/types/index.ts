// HyperClaw Dashboard Types

export type InstanceStatus = 'running' | 'stopped' | 'pending' | 'error';

export interface Instance {
  id: string;
  name: string;
  model: string;
  ramGb: number; // in GB - matches API response
  status: InstanceStatus;
  createdAt: string;
  expiresAt: string;
  endpoint?: string;
}

export interface User {
  id: string;
  email: string;
  plan: string;
  createdAt?: string;
}

export interface Stats {
  totalInstances: number;
  activeInstances: number;
  totalHours: number;
  monthlyCost: number;
  ramUsage?: number;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

// Create instance input - matches API expectations
export interface CreateInstanceInput {
  name: string;
  model: string;
  ram: number; // GB
  ttl: number; // Time to live in seconds
}