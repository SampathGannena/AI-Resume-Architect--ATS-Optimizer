import { createContext, createElement, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { apiClient, authApi, subscriptionApi } from '@/lib/api';
import type { User } from '@/lib/api/auth';
import type { Subscription } from '@/lib/api/subscription';

export type SubscriptionRow = {
  plan: 'free' | 'pro';
  resumes_used: number;
  cover_letters_used: number;
};

export const FREE_RESUME_LIMIT = 3;
export const FREE_COVER_LETTER_LIMIT = 3;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string, displayName?: string) => Promise<unknown>;
  logout: () => void;
  completeOAuth: (token: string) => Promise<unknown>;
};

const normalizeUser = (user: User & { _id?: string }) => ({
  ...user,
  id: user.id || user._id || '',
});

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initialize = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      apiClient.setToken(token);
      const response = await authApi.getMe();

      if (response.success && response.data) {
        setUser(normalizeUser(response.data));
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
      setUser(normalizeUser(response.data.user));
      return response;
    }

    throw new Error(response.message || 'Login failed');
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const response = await authApi.register(email, password, displayName);

    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
      setUser(normalizeUser(response.data.user));
      return response;
    }

    throw new Error(response.message || 'Registration failed');
  }, []);

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setUser(null);
  }, []);

  const completeOAuth = useCallback(async (token: string) => {
    apiClient.setToken(token);
    const response = await authApi.getMe();

    if (response.success && response.data) {
      setUser(normalizeUser(response.data));
      return response;
    }

    apiClient.setToken(null);
    throw new Error(response.message || 'OAuth login failed');
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, completeOAuth }),
    [user, loading, login, register, logout, completeOAuth],
  );

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const useSubscription = (userId: string | undefined) => {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setSub(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await subscriptionApi.get();
      if (response.success && response.data) {
        setSub({
          plan: response.data.plan,
          resumes_used: response.data.resumesUsed,
          cover_letters_used: response.data.coverLettersUsed,
        });
      }
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sub, loading, refetch };
};

export const canCreateResume = (sub: SubscriptionRow | null) => {
  if (!sub) return true; // optimistic while loading — server enforces real limit
  if (sub.plan === 'pro') return true;
  return sub.resumes_used < FREE_RESUME_LIMIT;
};

export const canCreateCoverLetter = (sub: SubscriptionRow | null) => {
  if (!sub) return true; // optimistic while loading — server enforces real limit
  if (sub.plan === 'pro') return true;
  return sub.cover_letters_used < FREE_COVER_LETTER_LIMIT;
};
