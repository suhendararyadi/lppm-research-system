import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import apiClient from '@/lib/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    isAuthenticated: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const response = await apiClient.login(email, password);
        
        if (response.success && response.data) {
          const { user, token, refreshToken } = response.data;
          
          // Set tokens in API client
          apiClient.setTokens(token, refreshToken);
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          return { success: true };
        } else {
          set({ isLoading: false });
          return { success: false, error: response.error || 'Login failed' };
        }
      } catch (error) {
        set({ isLoading: false });
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Login failed' 
        };
      }
    },

    logout: async () => {
      try {
        // Call logout API to invalidate tokens on server
        await apiClient.logout();
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
      
      // Clear tokens from API client
      apiClient.clearTokens();
      
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    },

    register: async (userData) => {
      set({ isLoading: true });
      try {
        const response = await apiClient.register(userData);
        
        if (response.success && response.data) {
          const { user, token, refreshToken } = response.data;
          
          // Set tokens in API client
          apiClient.setTokens(token, refreshToken);
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          return { success: true };
        } else {
          set({ isLoading: false });
          return { success: false, error: response.error || 'Registration failed' };
        }
      } catch (error) {
        set({ isLoading: false });
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Registration failed' 
        };
      }
    },

    setUser: (user: User) => {
      set({ user });
    },

    checkAuth: async () => {
      const { token, refreshToken } = get();
      
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      set({ isLoading: true });
      
      try {
        // Set tokens in API client
        apiClient.setTokens(token, refreshToken || undefined);
        
        // Verify token with backend
        const response = await apiClient.verifyToken();
        
        if (response.success && response.data) {
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Token is invalid, clear auth state
          await get().logout();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await get().logout();
      }
    },

    updateProfile: async (data) => {
      try {
        const response = await apiClient.updateProfile(data);
        
        if (response.success && response.data) {
          set({ user: response.data });
          return { success: true };
        } else {
          return { success: false, error: response.error || 'Profile update failed' };
        }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Profile update failed' 
        };
      }
    },

    changePassword: async (currentPassword, newPassword) => {
      try {
        const response = await apiClient.changePassword(currentPassword, newPassword);
        
        if (response.success) {
          return { success: true };
        } else {
          return { success: false, error: response.error || 'Password change failed' };
        }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Password change failed' 
        };
      }
    },
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
));