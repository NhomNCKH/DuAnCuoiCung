const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api/proxy/api/v1'  // Use proxy in production to avoid mixed content
  : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://144.91.104.237:3001/api/v1';

const HEALTH_URL = process.env.NODE_ENV === 'production'
  ? '/api/proxy/health'
  : 'http://144.91.104.237:3001/health';

// Types
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface RefreshTokenData {
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  exp?: number;
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  console.log("TOKEN:", token); 

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const api = {
  baseURL: API_BASE_URL,
  
  // Health endpoints
  async health() {
    const response = await fetch(HEALTH_URL);
    return response.json();
  },

  async healthDetailed() {
    const detailedUrl = process.env.NODE_ENV === 'production' 
      ? '/api/proxy/' 
      : 'http://144.91.104.237:3001/';
    const response = await fetch(detailedUrl);
    return response.json();
  },
  
  // Auth endpoints
  auth: {
    async register(data: RegisterData): Promise<ApiResponse> {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },

    async refreshToken(data: RefreshTokenData): Promise<ApiResponse> {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },

    async logout(data: RefreshTokenData): Promise<ApiResponse> {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },

    async getProfile(): Promise<ApiResponse<UserProfile>> {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return response.json();
    },

    // Upload avatar
    async uploadAvatar(file: File, token?: string): Promise<ApiResponse> {
      const formData = new FormData();
      formData.append("file", file);
      
      const accessToken = token || localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/auth/me/avatar`, {
        method: "POST",
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: formData,
      });

      return response.json();
    },

     async confirmAvatarUpload(data: { s3Key: string }): Promise<ApiResponse> {
      const response = await fetch(`${API_BASE_URL}/auth/me/avatar/s3`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    // Lấy avatar URL (có thể trả về presigned URL)
    async getAvatar(): Promise<ApiResponse<{ avatarUrl: string; s3Key?: string }>> {
      const response = await fetch(`${API_BASE_URL}/auth/me/avatar`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  },
            
  // Media endpoints
  media: {
    async getPresignedUploadUrl(data: { fileName: string; fileType: string }) {
      const response = await fetch(`${API_BASE_URL}/media/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },

    async getPresignedGetUrl(data: { fileName: string }) {
      const response = await fetch(`${API_BASE_URL}/media/presign-get`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    }
  }
};

