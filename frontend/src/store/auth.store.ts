import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { disconnectSocket } from '@/hooks/useSocket';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  role: string;
  institucionId?: string;
  fotoUrl?: string;
  debeCambiarPassword?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (token: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, token, refreshToken) => {
        set({ user, token, refreshToken, isAuthenticated: true });
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
        }
      },

      setTokens: (token, refreshToken) => {
        set({ token, refreshToken });
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
        }
      },

      logout: () => {
        disconnectSocket();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
