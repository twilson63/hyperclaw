/**
 * useAuth Hook - React Query integration for authentication
 * Provides auth state management with TanStack Query for session validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import type { User, LoginCredentials, RegisterCredentials } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API helper functions
async function fetchSession(): Promise<User> {
  const token = localStorage.getItem('hyperclaw-token');
  if (!token) {
    throw new Error('No token found');
  }

  const response = await fetch(`${API_BASE}/auth/session`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('hyperclaw-token');
      throw new Error('Session expired');
    }
    throw new Error(`Session check failed: ${response.statusText}`);
  }

  return response.json();
}

async function loginUser(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

async function registerUser(credentials: RegisterCredentials): Promise<{ user: User; token: string }> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

/**
 * Main authentication hook
 * Provides user state, loading status, and auth actions
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated, isLoading, setUser, setToken, setLoading, logout: storeLogout } = useAuthStore();

  // Session validation query
  const { 
    isFetching: isSessionLoading,
    data: sessionData,
    error: sessionError
  } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    enabled: !!token && !user,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Handle session response - TanStack Query v5 way
  useEffect(() => {
    if (sessionData) {
      setUser(sessionData);
      setLoading(false);
    }
  }, [sessionData, setUser, setLoading]);

  useEffect(() => {
    if (sessionError && !user) {
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  }, [sessionError, user, setUser, setToken, setLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: ({ user, token }) => {
      localStorage.setItem('hyperclaw-token', token);
      setToken(token);
      setUser(user);
      setLoading(false);
      queryClient.setQueryData(['session'], user);
      navigate('/');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: ({ user, token }) => {
      localStorage.setItem('hyperclaw-token', token);
      setToken(token);
      setUser(user);
      setLoading(false);
      queryClient.setQueryData(['session'], user);
      navigate('/');
    },
  });

  // Logout function
  const logout = () => {
    localStorage.removeItem('hyperclaw-token');
    storeLogout();
    queryClient.clear();
    navigate('/login');
  };

  return {
    user,
    isLoading: isLoading || isSessionLoading,
    isAuthenticated,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    logout,
    loginError: loginMutation.error?.message || null,
    registerError: registerMutation.error?.message || null,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}

export default useAuth;