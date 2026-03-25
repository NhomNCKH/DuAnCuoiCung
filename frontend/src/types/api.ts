// ============================================================
// API Types - aligned với ToeicBoost_BE response shapes
// ============================================================

// BE TransformInterceptor bọc mọi response thành shape này:
// { statusCode, message, data, timestamp, path }
export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

// ---- Auth request DTOs ----
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

// ---- User roles & statuses (khớp với BE enums) ----
export type UserRole = 'superadmin' | 'admin' | 'org_admin' | 'instructor' | 'curator' | 'learner';
export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deleted';

// ---- User object trả về trong login response ----
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  avatarS3Key?: string | null;
}

// ---- JWT payload từ GET /auth/me ----
// BE trả về JWT payload: { sub, email, role, iat, exp }
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions?: string[]; // Danh sách các code quyền (ví dụ: 'users.read', 'questions.manage')
  iat?: number;
  exp?: number;
}

// ---- Login response: data.data chứa user + tokens ----
// BE login trả về: { success, message, data: { user, accessToken, refreshToken, expiresIn } }
// Sau khi TransformInterceptor bọc: { statusCode, message, data: { success, message, data: { user, ... } } }
export interface UserDataWithPermissions extends UserData {
  permissions?: string[];
}

export interface LoginResponseInner {
  user: UserDataWithPermissions;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponseBody {
  success: boolean;
  message: string;
  data: LoginResponseInner;
}

// ApiResponse<LoginResponseBody> = toàn bộ response login
export type LoginApiResponse = ApiResponse<LoginResponseBody>;

// ---- Register response ----
export interface RegisterResponseBody {
  success: boolean;
  message: string;
  data: { user_id: string };
}
export type RegisterApiResponse = ApiResponse<RegisterResponseBody>;

// ---- Refresh token response ----
export interface RefreshResponseBody {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
export type RefreshApiResponse = ApiResponse<RefreshResponseBody>;

// ---- Logout response ----
export interface LogoutResponseBody {
  success: boolean;
  message: string;
}
export type LogoutApiResponse = ApiResponse<LogoutResponseBody>;

// ---- /auth/me response ----
export interface MeResponseBody {
  success: boolean;
  message: string;
  data: JwtPayload;
}
export type MeApiResponse = ApiResponse<MeResponseBody>;

// ---- UserProfile dùng trong FE state ----
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  status: UserStatus;
  avatarUrl?: string | null;
  avatarS3Key?: string | null;
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
