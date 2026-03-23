// Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'learner' | 'instructor';
  status: 'active' | 'inactive' | 'banned';
  avatarUrl?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}