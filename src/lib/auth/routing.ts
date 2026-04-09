import type { UserRole } from "@/types/api";

export type AuthMode = "login" | "register";

type QueryParamValue = string | string[] | null | undefined;

export const AUTH_PAGE_ROUTE = "/auth";
export const DEFAULT_STUDENT_ROUTE = "/student/dashboard";
export const DEFAULT_ADMIN_ROUTE = "/admin/dashboard";

export const ADMIN_ROLES: UserRole[] = ["admin", "superadmin", "org_admin"];

export function isAdminRole(role?: UserRole | null): boolean {
  return Boolean(role && ADMIN_ROLES.includes(role));
}

export function getFirstQueryValue(value: QueryParamValue): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function normalizeAuthMode(mode?: string | null): AuthMode {
  return mode === "register" ? "register" : "login";
}

export function normalizeRedirectPath(redirect?: string | null): string | null {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return null;
  }

  if (
    redirect.startsWith("/auth") ||
    redirect.startsWith("/login") ||
    redirect.startsWith("/register")
  ) {
    return null;
  }

  return redirect;
}

export function buildAuthRoute(options: {
  mode?: AuthMode;
  redirect?: string | null;
} = {}): string {
  const params = new URLSearchParams();
  const mode = normalizeAuthMode(options.mode);
  const redirect = normalizeRedirectPath(options.redirect);

  if (mode === "register") {
    params.set("mode", "register");
  }

  if (redirect) {
    params.set("redirect", redirect);
  }

  const query = params.toString();
  return query ? `${AUTH_PAGE_ROUTE}?${query}` : AUTH_PAGE_ROUTE;
}

export function resolvePostAuthRedirect(
  role?: UserRole | null,
  requestedRedirect?: string | null,
): string {
  if (isAdminRole(role)) {
    return DEFAULT_ADMIN_ROUTE;
  }

  return normalizeRedirectPath(requestedRedirect) ?? DEFAULT_STUDENT_ROUTE;
}
