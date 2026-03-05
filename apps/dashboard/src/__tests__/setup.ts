import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock import.meta.env for Vite
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:3000',
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});