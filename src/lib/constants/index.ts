// Application Constants

// User Roles
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  ORG_ADMIN: 'org_admin',
  LEARNER: 'learner',
  INSTRUCTOR: 'instructor',
  CURATOR: 'curator',
} as const;

// User Status
export const USER_STATUS = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
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
  AUTH: '/auth',
  LOGIN: '/auth',
  REGISTER: '/auth?mode=register',
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
  PRIMARY: 'from-blue-600 to-slate-900',
  SECONDARY: 'from-slate-900 to-blue-700',
  SUCCESS: 'from-blue-600 to-slate-900',
  WARNING: 'from-yellow-400 to-yellow-500',
  ERROR: 'from-red-500 to-red-600',
  INFO: 'from-blue-500 to-indigo-600',
} as const;
