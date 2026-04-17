'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  clearStoredUser,
  clearAuthSession,
  getAccessTokenExpiresAt,
	getStoredAccessToken,
	getStoredUserProfile,
	getStoredRefreshToken,
	persistAuthSession,
	persistStoredUser,
} from '@/lib/auth-session';
import type { UserProfile, LoginData, RegisterData, JwtPayload } from '@/types/api';

export interface AuthActionResult {
  success: boolean;
  message: string;
  user?: UserProfile;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<AuthActionResult>;
  register: (data: RegisterData) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const mergeUserProfile = useCallback(
    (payload: JwtPayload, fallbackUser?: UserProfile | null): UserProfile => {
      const roles =
        Array.isArray(payload.roles) && payload.roles.length > 0
          ? payload.roles
          : payload.role
            ? [payload.role]
            : fallbackUser?.roles ?? [];

      return {
        ...(fallbackUser ?? {}),
        id: payload.sub,
        name: payload.name ?? fallbackUser?.name ?? '',
        email: payload.email,
        role: payload.role,
        roles,
        permissions: payload.permissions || [],
        status: fallbackUser?.status ?? 'active',
        avatarUrl: payload.avatarUrl ?? fallbackUser?.avatarUrl ?? null,
        phone: payload.phone ?? fallbackUser?.phone,
        birthday: payload.birthday ?? fallbackUser?.birthday,
        address: payload.address ?? fallbackUser?.address,
        bio: payload.bio ?? fallbackUser?.bio,
        linkedin: payload.linkedin ?? fallbackUser?.linkedin,
        github: payload.github ?? fallbackUser?.github,
        twitter: payload.twitter ?? fallbackUser?.twitter,
      };
    },
    [],
  );

  const syncUserProfile = useCallback(
    (nextUser: UserProfile | null) => {
      setUser(nextUser);
      if (nextUser) {
        persistStoredUser(nextUser);
      } else {
        clearStoredUser();
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const rt = getStoredRefreshToken();
      if (rt) await apiClient.auth.logout({ refreshToken: rt });
    } catch {
      // ignore logout errors
    } finally {
      clearAuthSession();
      syncUserProfile(null);
    }
  }, [syncUserProfile]);

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
      syncUserProfile(null);
      return false;
    }
  }, [syncUserProfile]);

  useEffect(() => {
    const init = async () => {
      try {
        const token = getStoredAccessToken();
        const rt = getStoredRefreshToken();
        const parsedUser = getStoredUserProfile();

        if (parsedUser) {
          syncUserProfile(parsedUser);
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
              const freshUser = mergeUserProfile(payload, parsedUser);
              syncUserProfile(freshUser);
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
              const freshUser = mergeUserProfile(payload, parsedUser);
              syncUserProfile(freshUser);
            } else {
              await logout();
            }
          }
        } else {
          syncUserProfile(null);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
        syncUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [mergeUserProfile, refreshToken, logout, syncUserProfile]);

  useEffect(() => {
    const syncLogout = () => syncUserProfile(null);
    window.addEventListener('auth:session-cleared', syncLogout);
    return () => window.removeEventListener('auth:session-cleared', syncLogout);
  }, [syncUserProfile]);

  useEffect(() => {
    const syncUpdated = () => syncUserProfile(getStoredUserProfile());
    window.addEventListener('auth:user-updated', syncUpdated);
    return () => window.removeEventListener('auth:user-updated', syncUpdated);
  }, [syncUserProfile]);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.login(data);

      const inner = res.data?.data || (res as any).data || res;

      if (inner?.accessToken) {
        persistAuthSession(inner);
        syncUserProfile(inner.user);
        return {
          success: true,
          message: res.data?.message || 'Đăng nhập thành công',
          user: inner.user,
        };
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
