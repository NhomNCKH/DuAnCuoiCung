"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Lock,
  Mic,
  PenLine,
  Shield,
  Sun,
  Tag,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/auth/routing";
import { useTheme } from "@/contexts/ThemeContext";
import type { UserProfile } from "@/types/api";
import type { LucideIcon } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";

type AdminMenuItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  href?: string;
  permission?: string;
  children?: AdminMenuItem[];
};

type PermissionDescriptor = {
  code: string;
};

type RolePermissionCarrier = {
  permissions?: PermissionDescriptor[];
};

const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/admin/dashboard",
    permission: "dashboard.view",
  },
  {
    id: "user-management",
    icon: Users,
    label: "Người dùng",
    children: [
      {
        id: "rbac-users",
        icon: Users,
        label: "Tài khoản",
        href: "/admin/users",
        permission: "users.read",
      },
      {
        id: "rbac-roles",
        icon: Shield,
        label: "Vai trò",
        href: "/admin/settings?tab=roles",
        permission: "settings.manage",
      },
      {
        id: "rbac-permissions",
        icon: Lock,
        label: "Quyền",
        href: "/admin/settings?tab=permissions",
        permission: "settings.manage",
      },
      {
        id: "rbac-assignments",
        icon: UserPlus,
        label: "Gán vai trò",
        href: "/admin/settings?tab=users",
        permission: "settings.manage",
      },
    ],
  },
  {
    id: "question-bank",
    icon: BookOpen,
    label: "Câu hỏi",
    children: [
      {
        id: "question-tags",
        icon: Tag,
        label: "Phân loại",
        href: "/admin/questions?tab=tags",
        permission: "questions.manage",
      },
      {
        id: "question-groups",
        icon: BookOpen,
        label: "Nhóm câu hỏi",
        href: "/admin/questions?tab=groups",
        permission: "questions.manage",
      },
    ],
  },
  {
    id: "practice",
    icon: Dumbbell,
    label: "Luyện tập",
    children: [
      {
        id: "practice-vocabulary",
        icon: BookMarked,
        label: "Từ vựng",
        href: "/admin/practice/vocabulary",
        permission: "vocabulary.manage",
      },
      {
        id: "practice-speaking",
        icon: Mic,
        label: "Luyện nói",
        href: "/admin/practice/speaking",
        permission: "dashboard.view",
      },
      {
        id: "practice-writing",
        icon: PenLine,
        label: "Luyện viết",
        href: "/admin/practice/writing",
        permission: "dashboard.view",
      },
    ],
  },
  {
    id: "exam-templates",
    icon: FileText,
    label: "Đề thi",
    href: "/admin/exams",
    permission: "exam_templates.manage",
  },
  {
    id: "certificates",
    icon: Award,
    label: "Chứng chỉ",
    href: "/admin/certificates",
    permission: "credentials.manage",
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "Phân tích",
    href: "/admin/analytics",
    permission: "audit.view",
  },
];

function isPermissionDescriptor(value: unknown): value is PermissionDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string"
  );
}

function isRolePermissionCarrier(value: unknown): value is RolePermissionCarrier {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("permissions" in value)) {
    return false;
  }

  const permissions = value.permissions;

  return (
    permissions === undefined ||
    (Array.isArray(permissions) && permissions.every(isPermissionDescriptor))
  );
}

function hasRolePermission(roles: unknown, permission: string) {
  if (!Array.isArray(roles)) {
    return false;
  }

  return roles.some(
    (role) =>
      isRolePermissionCarrier(role) &&
      role.permissions?.some((item) => item.code === permission),
  );
}

function canAccessMenuItem(user: UserProfile | null, permission?: string) {
  if (!permission) return true;
  if (user?.permissions?.includes(permission)) return true;
  return hasRolePermission(user?.roles, permission);
}

function buildVisibleMenuItems(user: UserProfile | null) {
  return ADMIN_MENU_ITEMS
    .map((item) => {
      if (!item.children) return item;

      const visibleChildren = item.children.filter((child) =>
        canAccessMenuItem(user, child.permission),
      );

      return { ...item, children: visibleChildren };
    })
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      return canAccessMenuItem(user, item.permission);
    });
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ "user-management": true });
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const loadHeaderAvatar = useCallback(async () => {
    // reset quickly while loading
    setAvatarUrl("");
    try {
      const res = await apiClient.auth.getAvatar();
      const data = res.data as any;
      if (data?.s3Key) {
        const signed = await getSignedMediaUrl(String(data.s3Key));
        if (signed) {
          setAvatarUrl(signed);
          return;
        }
      }
      if (typeof data?.avatarUrl === "string") {
        setAvatarUrl(data.avatarUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/auth");
      } else if (user && !isAdminRole(user.role)) {
        router.replace("/student/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, router, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAvatarUrl("");
      return;
    }
    void loadHeaderAvatar();
  }, [isAuthenticated, loadHeaderAvatar]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const sync = () => void loadHeaderAvatar();
    window.addEventListener("auth:user-updated", sync);
    return () => window.removeEventListener("auth:user-updated", sync);
  }, [isAuthenticated, loadHeaderAvatar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = useMemo(() => buildVisibleMenuItems(user), [user]);

  const isHrefActive = (href?: string) => {
    if (!href) return false;
    const [targetPath, queryString] = href.split("?");
    const path = pathname ?? "";
    const qs = searchParams ?? new URLSearchParams();
    /** Trang chi tiết bộ từ: /admin/practice/vocabulary/[id] vẫn coi là mục «Từ vựng» active */
    if (targetPath === "/admin/practice/vocabulary") {
      const onVocab =
        path === targetPath || path.startsWith(`${targetPath}/`);
      if (!onVocab) return false;
      if (!queryString) return true;
      const expectedParams = new URLSearchParams(queryString);
      return Array.from(expectedParams.entries()).every(
        ([key, value]) => qs.get(key) === value,
      );
    }
    if (path !== targetPath) return false;
    if (!queryString) return true;
    const expectedParams = new URLSearchParams(queryString);
    return Array.from(expectedParams.entries()).every(
      ([key, value]) => qs.get(key) === value,
    );
  };

  const currentPageLabel = (() => {
    for (const item of menuItems) {
      if (item.children?.length) {
        const activeChild = item.children.find((child) => isHrefActive(child.href));
        if (activeChild) return activeChild.label;
      }
      if (isHrefActive(item.href)) return item.label;
    }
    return "Dashboard";
  })();

  const handleLogout = async () => {
    await logout();
    setProfileMenuOpen(false);
    router.replace("/auth");
  };

  const roleLabel =
    user?.role === "superadmin" ? "Super Admin" : user?.role === "org_admin" ? "Org Admin" : "Admin";
  const isDarkTheme = theme === "dark";
  const topbarClassName = isDarkTheme
    ? "admin-topbar sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur"
    : "admin-topbar sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur";
  const pageTitleClassName = isDarkTheme
    ? "text-base font-semibold text-slate-900 md:text-lg"
    : "text-base font-semibold text-blue-900 md:text-lg";
  const themeToggleButtonClassName = isDarkTheme
    ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
    : "inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100";
  const profileButtonClassName = isDarkTheme
    ? "group flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-2 text-slate-900 transition-all duration-300 hover:bg-slate-50 hover:pr-3"
    : "group flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 py-1.5 pl-1.5 pr-2 text-blue-900 transition-all duration-300 hover:bg-blue-100 hover:pr-3";
  const profileAvatarClassName = isDarkTheme
    ? "flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
    : "flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white";
  const expandedRoleLabelClassName = `flex items-center gap-1 overflow-hidden whitespace-nowrap text-xs font-semibold transition-all duration-300 ${
    profileMenuOpen
      ? "max-w-[120px] opacity-100"
      : "max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100"
  }`;
  const roleIconClassName = isDarkTheme ? "h-3.5 w-3.5 text-slate-500" : "h-3.5 w-3.5 text-blue-600";
  const profileMenuClassName = isDarkTheme
    ? "absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
    : "absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg";
  const profileMenuAvatarClassName = isDarkTheme
    ? "flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
    : "flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white";

  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdminRole(user?.role)) {
    return null;
  }

  return (
    <div className={`app-shell admin-theme ${theme === "dark" ? "admin-dark" : "admin-light"}`}>
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? "72px" : "232px" }}
        transition={{ duration: 0.2 }}
        className={`admin-sidebar fixed left-0 top-0 z-50 h-full border-r border-slate-200 bg-white text-slate-700 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-200`}
      >
        <div className="flex h-full flex-col">
          <div className="relative h-[72px] w-full overflow-hidden border-b border-slate-200">
            <div className="relative h-full w-full">
              <Image
                src={theme === "dark" ? "/logo/logo_website_dark.svg" : "/logo/logo_website.svg"}
                alt="TOEIC Master"
                fill
                sizes={sidebarCollapsed ? "72px" : "232px"}
                className={
                  sidebarCollapsed
                    ? "object-contain object-center"
                    : "object-fill object-center [transform-origin:center_center] [transform:scaleX(1.16)]"
                }
                priority
              />
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-2 top-2 rounded bg-white/85 p-1 text-slate-500 shadow-sm lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {menuItems.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const isActive = isHrefActive(item.href);
              const hasActiveChild = item.children?.some((child) => isHrefActive(child.href)) ?? false;
              const isExpanded = expandedMenus[item.id] ?? hasActiveChild;

              if (hasChildren) {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => setExpandedMenus((prev) => ({ ...prev, [item.id]: !isExpanded }))}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                        hasActiveChild
                          ? theme === "dark"
                            ? "bg-slate-800 text-slate-100"
                            : "bg-slate-100 text-slate-900"
                          : theme === "dark"
                            ? "text-slate-200 hover:bg-slate-800"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="truncate font-medium">{item.label}</span>
                          <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </>
                      )}
                    </button>

                    {!sidebarCollapsed && isExpanded && (
                      <div className="space-y-1 pl-7">
                        {item.children?.map((child) => {
                          const childActive = isHrefActive(child.href);
                          return (
                            <Link
                              key={child.id}
                              href={child.href || "#"}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors ${
                                childActive
                                  ? theme === "dark"
                                    ? "bg-slate-800 text-slate-100"
                                    : "bg-slate-100 text-slate-900"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:bg-slate-800"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <child.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate font-medium">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href || "#"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    isActive
                      ? theme === "dark"
                        ? "bg-slate-800 text-slate-100"
                        : "bg-slate-100 text-slate-900"
                      : theme === "dark"
                        ? "text-slate-200 hover:bg-slate-800"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:flex"
              aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.aside>

      <main className={`admin-main transition-all duration-200 ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[232px]"}`}>
        <header className={topbarClassName}>
          <div className="flex h-[72px] items-center justify-between px-5 md:px-8">
            <h1 className={pageTitleClassName}>
              {currentPageLabel}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={themeToggleButtonClassName}
                aria-label={theme === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className={profileButtonClassName}
                  aria-label="Open profile menu"
                >
                  <div className={profileAvatarClassName}>
                    {user?.name?.charAt(0) || "A"}
                  </div>
                  <div className={expandedRoleLabelClassName}>
                    <Shield className={roleIconClassName} />
                    <span>{roleLabel}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {profileMenuOpen && (
                  <div className={profileMenuClassName}>
                    <div className="border-b border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className={profileMenuAvatarClassName}>
                          {user?.name?.charAt(0) || "A"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                          <p className="truncate text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content relative px-4 py-5 md:px-8">{children}</div>
      </main>
    </div>
  );
}
