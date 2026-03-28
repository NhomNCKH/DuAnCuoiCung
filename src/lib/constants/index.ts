// Application Constants

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  LEARNER: 'learner', 
  INSTRUCTOR: 'instructor'
} as const;

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned'
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user'
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/me'
  },
  MEDIA: {
    UPLOAD: '/media/upload',
    PRESIGN_GET: '/media/presign-get'
  }
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    CERTIFICATES: '/admin/certificates',
    ANALYTICS: '/admin/analytics',
    BLOCKCHAIN: '/admin/blockchain'
  },
  STUDENT: {
    DASHBOARD: '/student/dashboard',
    LESSONS: '/student/lessons',
    PRACTICE: '/student/practice',
    CERTIFICATES: '/student/certificates',
    PROFILE: '/student/profile'
  }
} as const;

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: 'from-emerald-500 to-teal-500',
  SECONDARY: 'from-blue-500 to-blue-600',
  SUCCESS: 'from-green-500 to-green-600',
  WARNING: 'from-yellow-500 to-yellow-600',
  ERROR: 'from-red-500 to-red-600',
  INFO: 'from-purple-500 to-purple-600'
} as const;