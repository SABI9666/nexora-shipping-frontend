'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setStoredAuth, clearStoredAuth, getStoredUser } from '@/lib/auth';
import { User, LoginResponse } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', {
      email,
      password,
    });
    const { user, accessToken, refreshToken } = response.data.data;
    setStoredAuth(user, accessToken, refreshToken);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
      const response = await api.post<{ success: boolean; data: LoginResponse }>('/auth/register', data);
      const { user, accessToken, refreshToken } = response.data.data;
      setStoredAuth(user, accessToken, refreshToken);
      setUser(user);
      return user;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearStoredAuth();
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me');
    const updatedUser = response.data.data;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  }, []);

  return { user, loading, login, register, logout, refreshUser, isAdmin: user?.role === 'ADMIN' };
}
