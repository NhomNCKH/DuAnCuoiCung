'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  clearAuthSession,
  getAccessTokenExpiresAt,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  persistAuthSession,
} from '@/lib/auth-session';
import type { UserProfile, LoginData, RegisterData } from '@/types/api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = useCallback(async () => {
    try {
      const rt = getStoredRefreshToken();
      if (rt) await apiClient.auth.logout({ refreshToken: rt });
    } catch {
      // ignore logout errors
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const rt = getStoredRefreshToken();
      if (!rt) return false;

      const res = await apiClient.auth.refreshToken({ refreshToken: rt });
      const inner = res.data?.data || (res as any).data || res;

      if (inner?.accessToken) {
        persistAuthSession(inner);
        return true;
      }
      return false;
    } catch {
      clearAuthSession();
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = getStoredAccessToken();
        const rt = getStoredRefreshToken();
        const storedUser = getStoredUser();
        const parsedUser = storedUser ? JSON.parse(storedUser) as UserProfile : null;

        if (parsedUser) {
          setUser(parsedUser);
        }

        if (token || rt) {
          const tokenExpiresAt = getAccessTokenExpiresAt();
          const shouldRefreshFirst =
            !token || !tokenExpiresAt || tokenExpiresAt <= Date.now() + 30_000;

          if (shouldRefreshFirst) {
            const refreshed = await refreshToken();
            if (!refreshed) {
              await logout();
              return;
            }
          }

          try {
            const res = await apiClient.auth.getMe();
            if (res.statusCode === 200 && res.data?.data) {
              const payload = res.data.data;
              const rolesFromJwt =
                Array.isArray(payload.roles) && payload.roles.length > 0
                  ? payload.roles
                  : payload.role
                    ? [payload.role]
                    : parsedUser?.roles ?? [];
              const freshUser: UserProfile = {
                ...(parsedUser ?? {}),
                id: payload.sub,
                name: parsedUser?.name ?? '',
                email: payload.email,
                role: payload.role,
                roles: rolesFromJwt,
                permissions: payload.permissions || [],
                status: parsedUser?.status ?? 'active',
              };
              setUser(freshUser);
              localStorage.setItem('user', JSON.stringify(freshUser));
            } else {
              throw new Error('Session expired');
            }
          } catch (verifyErr) {
            console.warn('Auth verification failed, trying refresh...', verifyErr);
            const refreshed = await refreshToken();
            if (!refreshed) {
              await logout();
              return;
            }

            const retry = await apiClient.auth.getMe();
            const payload = retry.data?.data;
            if (retry.statusCode === 200 && payload) {
              const rolesFromJwt =
                Array.isArray(payload.roles) && payload.roles.length > 0
                  ? payload.roles
                  : payload.role
                    ? [payload.role]
                    : parsedUser?.roles ?? [];
              const freshUser: UserProfile = {
                ...(parsedUser ?? {}),
                id: payload.sub,
                name: parsedUser?.name ?? '',
                email: payload.email,
                role: payload.role,
                roles: rolesFromJwt,
                permissions: payload.permissions || [],
                status: parsedUser?.status ?? 'active',
              };
              setUser(freshUser);
              localStorage.setItem('user', JSON.stringify(freshUser));
            } else {
              await logout();
            }
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshToken, logout]);

  useEffect(() => {
    const syncLogout = () => setUser(null);
    window.addEventListener('auth:session-cleared', syncLogout);
    return () => window.removeEventListener('auth:session-cleared', syncLogout);
  }, []);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.login(data);

      const inner = res.data?.data || (res as any).data || res;

      if (inner?.accessToken) {
        persistAuthSession(inner);
        localStorage.setItem('user', JSON.stringify(inner.user));
        setUser(inner.user);
        return { success: true, message: res.data?.message || 'Đăng nhập thành công' };
      }

      return { success: false, message: res.message || 'Đăng nhập thất bại: Không tìm thấy token' };
    } catch (err: any) {
      const msg =
        err.statusCode === 401 ? 'Email hoặc mật khẩu không đúng' :
        err.statusCode === 403 ? 'Tài khoản tạm thời bị khóa. Vui lòng thử lại sau' :
        err.message || 'Lỗi kết nối. Vui lòng thử lại.';
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await apiClient.auth.register(data);
      if (res.statusCode === 201) {
        return { success: true, message: res.data?.message || 'Đăng ký thành công' };
      }
      return { success: false, message: res.message || 'Đăng ký thất bại' };
    } catch (err: any) {
      const msg =
        err.statusCode === 409 ? 'Email đã được sử dụng' :
        err.message || 'Lỗi kết nối. Vui lòng thử lại.';
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
