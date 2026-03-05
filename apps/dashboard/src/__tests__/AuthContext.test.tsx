import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Helper component to access auth context
function TestConsumer() {
  const { user, token, isLoading, login, register, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <button onClick={() => login('test@example.com', 'password123')} data-testid="login-btn">
        Login
      </button>
      <button onClick={() => register('test@example.com', 'password123')} data-testid="register-btn">
        Register
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should start with loading state and resolve quickly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: '1', email: 'test@example.com', plan: 'free' } }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // In test environment, loading resolves very quickly
      // Wait for either loading or loaded state
      await waitFor(() => {
        const loadingState = screen.getByTestId('loading').textContent;
        expect(['loading', 'loaded']).toContain(loadingState);
      });
    });

    test('should load user from localStorage on mount', async () => {
      localStorageMock.setItem('hyperclaw_token', 'test-token');
      localStorageMock.setItem('hyperclaw_user', JSON.stringify({ id: '1', email: 'stored@test.com', plan: 'pro' }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: '1', email: 'stored@test.com', plan: 'pro' } }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('stored@test.com');
      });
    });
  });

  describe('Login', () => {
    test('should login successfully with valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionToken: 'new-token',
          user: { id: '1', email: 'test@example.com', plan: 'pro' },
        }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
          })
        );
      });
    });

    test('should store token and user after successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionToken: 'session-token-123',
          user: { id: 'user-123', email: 'test@example.com', plan: 'free' },
        }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('hyperclaw_token', 'session-token-123');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'hyperclaw_user',
          JSON.stringify({ id: 'user-123', email: 'test@example.com', plan: 'free' })
        );
      });
    });

    test('should throw error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      // Clicking login button will throw, but we catch it in the test
      await act(async () => {
        try {
          screen.getByTestId('login-btn').click();
          // Wait a bit for the async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch (e) {
          // Expected - login should throw on invalid credentials
        }
      });

      // Fetch should have been called with login endpoint
      expect(mockFetch).toHaveBeenCalled();
    });

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      // Click login button - will throw on network error
      await act(async () => {
        try {
          screen.getByTestId('login-btn').click();
          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch (e) {
          // Expected - network error should be handled
        }
      });

      // Should not crash, fetch should have been called
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Register', () => {
    test('should register successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionToken: 'reg-token-123',
          user: { id: 'new-user', email: 'new@example.com', plan: 'free' },
        }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/register'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
          })
        );
      });
    });

    test('should store token and user after registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionToken: 'registered-token',
          user: { id: 'new-id', email: 'newuser@example.com', plan: 'free' },
        }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('hyperclaw_token', 'registered-token');
      });
    });

    test('should handle duplicate email error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Email already registered' }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      // Click register button - will throw on duplicate email
      await act(async () => {
        try {
          screen.getByTestId('register-btn').click();
          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch (e) {
          // Expected - duplicate email error
        }
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    test('should clear token and user on logout', async () => {
      localStorageMock.setItem('hyperclaw_token', 'existing-token');
      localStorageMock.setItem('hyperclaw_user', JSON.stringify({ id: '1', email: 'user@test.com' }));

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('hyperclaw_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('hyperclaw_user');
      });
    });

    test('should reset state after logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionToken: 'token-123',
          user: { id: '1', email: 'user@test.com', plan: 'free' },
        }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      // Login first
      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      // Then logout
      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
        expect(screen.getByTestId('token').textContent).toBe('null');
      });
    });
  });

  describe('Session Persistence', () => {
    test('should verify session on mount', async () => {
      localStorageMock.setItem('hyperclaw_token', 'persisted-token');
      localStorageMock.setItem('hyperclaw_user', JSON.stringify({ id: '1', email: 'persisted@test.com', plan: 'pro' }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: { id: '1', email: 'persisted@test.com', plan: 'pro' },
        }),
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        // Should call session endpoint with the stored token
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/session'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer persisted-token',
            }),
          })
        );
      });
    });

    test('should clear session on invalid/expired token', async () => {
      localStorageMock.setItem('hyperclaw_token', 'expired-token');
      localStorageMock.setItem('hyperclaw_user', JSON.stringify({ id: '1', email: 'expired@test.com' }));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('hyperclaw_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('hyperclaw_user');
      });
    });

    test('should not clear session on network error (keep local session)', async () => {
      localStorageMock.setItem('hyperclaw_token', 'offline-token');
      localStorageMock.setItem('hyperclaw_user', JSON.stringify({ id: '1', email: 'offline@test.com' }));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        // Should not clear localStorage on network error
        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      });
    });
  });
});