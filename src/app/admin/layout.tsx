"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Lock,
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

type AdminMenuItem = {
  id: string;
  icon: any;
  label: string;
  href?: string;
  permission?: string;
  children?: AdminMenuItem[];
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ "user-management": true });
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = useMemo(() => {
    const canAccess = (permission?: string) => {
      if (!permission) return true;
      if (user?.permissions?.includes(permission)) return true;
      return (user as any)?.roles?.some((role: any) =>
        role.permissions?.some((p: any) => p.code === permission)
      );
    };

    const rawItems: AdminMenuItem[] = [
      {
        id: "dashboard",
        icon: LayoutDashboard,
        label: "Tổng quan",
        href: "/admin/dashboard",
        permission: "dashboard.view",
      },
      {
        id: "user-management",
        icon: Users,
        label: "Quản lý người dùng",
        children: [
          {
            id: "rbac-users",
            icon: Users,
            label: "Quản lí người dùng",
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
            label: "Quyền hạn",
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
        label: "Ngân hàng câu hỏi",
        children: [
          {
            id: "question-tags",
            icon: Tag,
            label: "Phân loại câu hỏi",
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

    return rawItems
      .map((item) => {
        if (!item.children) return item;
        const visibleChildren = item.children.filter((child) => canAccess(child.permission));
        return { ...item, children: visibleChildren };
      })
      .filter((item) => {
        if (item.children) return item.children.length > 0;
        return canAccess(item.permission);
      });
  }, [user]);

  const isHrefActive = (href?: string) => {
    if (!href) return false;
    const [targetPath, queryString] = href.split("?");
    if (pathname !== targetPath) return false;
    if (!queryString) return true;
    const expectedParams = new URLSearchParams(queryString);
    return Array.from(expectedParams.entries()).every(([key, value]) => searchParams.get(key) === value);
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
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
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
        animate={{ width: sidebarCollapsed ? "76px" : "248px" }}
        transition={{ duration: 0.2 }}
        className={`admin-sidebar fixed left-0 top-0 z-50 h-full border-r border-blue-100 bg-white text-slate-700 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-200`}
      >
        <div className="flex h-full flex-col">
          <div className="relative h-[80px] w-full overflow-hidden border-b border-blue-100">
            <div className="relative h-full w-full">
              <Image
                src={theme === "dark" ? "/logo/logo_website_dark.svg" : "/logo/logo_website.svg"}
                alt="TOEIC Master"
                fill
                sizes={sidebarCollapsed ? "76px" : "248px"}
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

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                        hasActiveChild
                          ? theme === "dark"
                            ? "bg-slate-800 text-amber-300"
                            : "bg-blue-50 text-blue-700"
                          : theme === "dark"
                            ? "text-slate-200 hover:bg-slate-800 hover:text-amber-300"
                            : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
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
                      <div className="space-y-1 pl-8">
                        {item.children?.map((child) => {
                          const childActive = isHrefActive(child.href);
                          return (
                            <Link
                              key={child.id}
                              href={child.href || "#"}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${
                                childActive
                                  ? theme === "dark"
                                    ? "bg-amber-400 text-slate-900"
                                    : "bg-blue-600 text-white"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:bg-slate-800 hover:text-amber-300"
                                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
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
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? theme === "dark"
                        ? "bg-amber-400 text-slate-900"
                        : "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "text-slate-200 hover:bg-slate-800 hover:text-amber-300"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-blue-100 p-3">
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 lg:flex"
              aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.aside>

      <main className={`admin-main transition-all duration-200 ${sidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[248px]"}`}>
        <header className="admin-topbar sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
          <div className="flex h-[80px] items-center justify-between px-5 md:px-8">
            <h1 className="text-base font-semibold text-blue-900 md:text-lg">
              {currentPageLabel}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                aria-label={theme === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="group flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 py-1.5 pl-1.5 pr-2 text-blue-900 transition-all duration-300 hover:bg-blue-100 hover:pr-3"
                aria-label="Open profile menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {user?.name?.charAt(0) || "A"}
                </div>
                <div
                  className={`flex items-center gap-1 overflow-hidden whitespace-nowrap text-xs font-semibold transition-all duration-300 ${
                    profileMenuOpen
                      ? "max-w-[120px] opacity-100"
                      : "max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  <span>{roleLabel}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
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
