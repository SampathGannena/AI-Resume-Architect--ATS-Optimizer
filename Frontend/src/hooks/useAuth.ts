import { useState, useEffect, useCallback } from 'react';
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

export const useAuth = () => {
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
        const u: any = response.data;
        setUser({ ...u, id: u.id || u._id });
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

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
      setUser(response.data.user);
      return response;
    }

    throw new Error(response.message || 'Login failed');
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const response = await authApi.register(email, password, displayName);

    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
      setUser(response.data.user);
      return response;
    }

    throw new Error(response.message || 'Registration failed');
  };

  const logout = () => {
    apiClient.setToken(null);
    setUser(null);
  };

  const completeOAuth = async (token: string) => {
    apiClient.setToken(token);
    const response = await authApi.getMe();

    if (response.success && response.data) {
      const u: any = response.data;
      setUser({ ...u, id: u.id || u._id });
      return response;
    }

    apiClient.setToken(null);
    throw new Error(response.message || 'OAuth login failed');
  };

  return { user, loading, login, register, logout, completeOAuth };
};

export const useSubscription = (userId: string | undefined) => {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
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
  };

  useEffect(() => {
    refetch();
  }, [userId]);

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
