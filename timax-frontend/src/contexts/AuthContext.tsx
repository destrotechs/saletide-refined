'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, LoginCredentials, apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const isAuthenticated = !!user;

  // Configuration
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes (before 30min expiry)
  const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  }, []);

  // Auto logout due to inactivity
  const autoLogout = useCallback(async () => {
    console.log('Auto-logout due to inactivity');
    clearTimers();

    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Auto-logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [clearTimers]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      autoLogout();
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, autoLogout, INACTIVITY_TIMEOUT]);

  // Automatic token refresh
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      // The API client automatically handles token refresh in the interceptor
      // We just need to make a request to trigger the refresh if needed
      await apiClient.getCurrentUser();

      console.log('Token refreshed successfully');

      // Schedule next refresh
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
      }
      tokenRefreshTimerRef.current = setTimeout(refreshToken, TOKEN_REFRESH_INTERVAL);

    } catch (error) {
      console.warn('Token refresh failed:', error);
      // If refresh fails, logout the user
      await autoLogout();
    }
  }, [autoLogout, TOKEN_REFRESH_INTERVAL]);

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      const response = await apiClient.login(credentials);

      // Store tokens (API returns access_token and refresh_token)
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      setUser(response.user);

      // Start timers after successful login
      resetInactivityTimer();

      // Start token refresh timer
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
      }
      tokenRefreshTimerRef.current = setTimeout(refreshToken, TOKEN_REFRESH_INTERVAL);

      return response.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    clearTimers();

    try {
      await apiClient.logout();
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.warn('Failed to refresh user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');

      if (token) {
        try {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);

          // Start timers after successful authentication
          resetInactivityTimer();

          // Start token refresh timer
          if (tokenRefreshTimerRef.current) {
            clearTimeout(tokenRefreshTimerRef.current);
          }
          tokenRefreshTimerRef.current = setTimeout(refreshToken, TOKEN_REFRESH_INTERVAL);

        } catch (error) {
          console.warn('Failed to get current user:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [resetInactivityTimer, refreshToken, TOKEN_REFRESH_INTERVAL]);

  // Listen for auth logout events from API client
  useEffect(() => {
    const handleAuthLogout = (event: CustomEvent) => {
      console.log('Auth logout event received:', event.detail);
      clearTimers();
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Ensure redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleAuthLogout as EventListener);
      return () => {
        window.removeEventListener('auth:logout', handleAuthLogout as EventListener);
      };
    }
  }, [clearTimers]);

  // Set up activity event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Cleanup function
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isAuthenticated, handleUserActivity, ACTIVITY_EVENTS]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    resetInactivityTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}