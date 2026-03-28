// src/config/roles.ts
export const ROLES = {
  LEARNER: 'learner',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  [ROLES.LEARNER]: [
    'view:dashboard',
    'view:practice',
    'view:interview',
    'view:certificate',
    'create:interview',
    'submit:practice',
  ],
  [ROLES.ADMIN]: [
    'view:admin-dashboard',
    'view:all-students',
    'view:all-certificates',
    'create:certificate',
    'verify:certificate',
    'manage:users',
    'manage:system',
    'view:blockchain',
    'view:analytics',
  ],
} as const;

export type Permission = typeof PERMISSIONS[UserRole][number];