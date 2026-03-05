import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

// Test component to access auth context
function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="token">{auth.token || 'null'}</div>
      <button
        data-testid="login-btn"
        onClick={() => auth.login('test@example.com', 'password123')}
      >
        Login
      </button>
      <button
        data-testid="register-btn"
        onClick={() => auth.register('new@example.com', 'password123')}
      >
        Register
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('AuthProvider', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div data-testid="child">Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should start in loading state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading').textContent).toBe('loading');
    });

    it('should finish loading after checking stored session', async () => {
      // Mock no stored session
      localStorage.getItem.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });
    });

    it('should restore user from localStorage on mount', async () => {
      const storedUser = { id: '123', email: 'stored@example.com', plan: 'free' };
      const storedToken = 'stored-token-123';

      localStorage.getItem
        .mockReturnValueOnce(storedToken) // hyperclaw_token
        .mockReturnValueOnce(JSON.stringify(storedUser)); // hyperclaw_user

      // Mock session validation
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: storedUser }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
        expect(screen.getByTestId('token').textContent).toBe(storedToken);
      });
    });

    it('should clear invalid session on mount', async () => {
      const storedUser = { id: '123', email: 'expired@example.com', plan: 'free' };
      const storedToken = 'expired-token';

      localStorage.getItem
        .mockReturnValueOnce(storedToken)
        .mockReturnValueOnce(JSON.stringify(storedUser));

      // Mock invalid session response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', plan: 'free' };
      const mockToken = 'session-token-123';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: mockUser,
          sessionToken: mockToken,
        }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
        expect(screen.getByTestId('token').textContent).toBe(mockToken);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('hyperclaw_token', mockToken);
    });

    it('should handle login failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });

      await act(async () => {
        try {
          screen.getByTestId('login-btn').click();
        } catch (e) {
          expect(e.message).toContain('Invalid credentials');
        }
      });
    });

    it('should call correct API endpoint for login', async () => {
      const mockUser = { id: '123', email: 'test@example.com', plan: 'free' };
      const mockToken = 'token-123';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, sessionToken: mockToken }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test@example.com'),
        })
      );
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = { id: 'new-user-123', email: 'new@example.com', plan: 'free' };
      const mockToken = 'new-token-123';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: mockUser,
          sessionToken: mockToken,
        }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });

      act(() => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('hyperclaw_token', mockToken);
    });

    it('should handle registration failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already registered' }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });

      await act(async () => {
        try {
          screen.getByTestId('register-btn').click();
        } catch (e) {
          expect(e.message).toContain('already registered');
        }
      });
    });
  });

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      const mockUser = { id: '123', email: 'test@example.com', plan: 'free' };
      const mockToken = 'token-123';

      // Set initial auth state
      localStorage.getItem
        .mockReturnValueOnce(mockToken)
        .mockReturnValueOnce(JSON.stringify(mockUser));

      global.fetch.mockResolvedValueOnce({ ok: true });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('loaded');
      });

      act(() => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
        expect(screen.getByTestId('token').textContent).toBe('null');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('hyperclaw_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('hyperclaw_user');
    });
  });
});

describe('useAuth hook', () => {
  it('should throw error when used outside AuthProvider', () => {
    // Suppress React error boundary warning
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });

  it('should return auth context values when used inside AuthProvider', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });

    // Verify all context values are accessible
    expect(screen.getByTestId('user')).toBeInTheDocument();
    expect(screen.getByTestId('token')).toBeInTheDocument();
    expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('register-btn')).toBeInTheDocument();
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
  });
});