// src/services/authService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api_v1';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  timestamp: string;
  path: string;
}

export const authService = {
  // Đăng nhập
  async login(data: LoginRequest): Promise<AuthResponse> {
    console.log('Calling login API:', `${API_BASE_URL}/auth/login`);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log('Login response:', result);

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Đăng ký
  async register(data: RegisterRequest): Promise<AuthResponse> {
    console.log('Calling register API:', `${API_BASE_URL}/auth/register`);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log('Register response:', result);

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Lấy thông tin user hiện tại
  async getCurrentUser(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Đăng xuất
  async logout(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  },

  // Lưu token vào localStorage
  saveTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  },

  // Lấy token
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },

  // Xóa token
  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Lưu thông tin user
  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser(): any | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Kiểm tra đã đăng nhập chưa
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};