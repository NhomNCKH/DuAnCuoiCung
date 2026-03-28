'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, LoginData, RegisterData, UserProfile } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await api.auth.getProfile();
        if (response.statusCode === 200) {
          setUser(response.data);
        } else {
          // Token might be expired, try refresh
          await refreshToken();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginData) => {
    try {
      console.log('Attempting login with:', data);
      const response = await api.auth.login(data);
      console.log('Login response:', response);
      
      if (response.statusCode === 200 && response.data.success) {
        const { user: userData, accessToken, refreshToken } = response.data.data;
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Set user data
        setUser(userData);
        
        console.log('Login successful, user set:', userData);
        return { success: true, message: response.data.message };
      } else {
        console.log('Login failed:', response);
        return { success: false, message: response.message || 'Đăng nhập thất bại' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.auth.register(data);
      
      if (response.statusCode === 201) {
        return { success: true, message: response.data.message || 'Đăng ký thành công' };
      } else {
        return { success: false, message: response.message || 'Đăng ký thất bại' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.auth.logout({ refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) return false;

      const response = await api.auth.refreshToken({ refreshToken: refreshTokenValue });
      
      if (response.statusCode === 200) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        // Get updated user profile
        const profileResponse = await api.auth.getProfile();
        if (profileResponse.statusCode === 200) {
          setUser(profileResponse.data);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}