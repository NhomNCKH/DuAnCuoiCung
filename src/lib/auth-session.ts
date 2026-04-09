import type { UserProfile } from "@/types/api";

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const ACCESS_TOKEN_EXPIRES_AT_KEY = 'accessTokenExpiresAt';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_HINT_COOKIE = 'authRefreshHint';

const REFRESH_HINT_MAX_AGE = 7 * 24 * 60 * 60;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(padded)) as { exp?: number };

    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(USER_KEY);
}

export function getStoredUserProfile(): UserProfile | null {
  const rawUser = getStoredUser();
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as UserProfile;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function getAccessTokenExpiresAt(): number | null {
  if (!isBrowser()) return null;

  const storedExpiresAt = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  if (storedExpiresAt) {
    const parsed = Number(storedExpiresAt);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const accessToken = getStoredAccessToken();
  if (!accessToken) return null;

  return decodeJwtExpiry(accessToken);
}

export function persistAuthSession(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}): void {
  if (!isBrowser()) return;

  const expiresAt =
    typeof tokens.expiresIn === 'number' && tokens.expiresIn > 0
      ? Date.now() + tokens.expiresIn * 1000
      : decodeJwtExpiry(tokens.accessToken);

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

  if (expiresAt) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
  } else {
    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  }

  const accessTokenMaxAge =
    expiresAt && expiresAt > Date.now()
      ? Math.max(Math.floor((expiresAt - Date.now()) / 1000), 1)
      : Math.max(tokens.expiresIn ?? 1, 1);

  document.cookie = `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}; path=/; max-age=${accessTokenMaxAge}; SameSite=Lax`;
  document.cookie = `${REFRESH_HINT_COOKIE}=1; path=/; max-age=${REFRESH_HINT_MAX_AGE}; SameSite=Lax`;
  window.dispatchEvent(new Event('auth:session-updated'));
}

export function persistStoredUser(user: UserProfile): void {
  if (!isBrowser()) return;

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(USER_KEY);
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearStoredUser();
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${REFRESH_HINT_COOKIE}=; path=/; max-age=0`;
  window.dispatchEvent(new Event('auth:session-cleared'));
}
