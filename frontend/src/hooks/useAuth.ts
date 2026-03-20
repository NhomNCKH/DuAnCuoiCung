// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getAccessToken();
      const userData = authService.getUser();
      
      if (token && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = async () => {
    const token = authService.getAccessToken();
    if (token) {
      await authService.logout(token);
    }
    authService.clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/');
  };

  return {
    user,
    loading,
    isAuthenticated,
    logout,
  };
}