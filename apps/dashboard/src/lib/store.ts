/**
 * Auth Store - Zustand state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'hyperclaw-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// UI Store for global UI state
interface UIState {
  sidebarOpen: boolean;
  createModalOpen: boolean;
  
  toggleSidebar: () => void;
  setCreateModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  createModalOpen: false,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCreateModalOpen: (open) => set({ createModalOpen: open }),
}));