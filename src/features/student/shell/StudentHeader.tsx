"use client";

import Link from "next/link";
import { useState } from "react";
import {
  User,
  LogOut,
  ChevronDown,
  Headphones,
  BookOpen,
  PenTool,
  Menu,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  Settings,
  HelpCircle,
} from "lucide-react";
import type { StudentNavItem } from "./config";

type Theme = "light" | "dark";

type Props = {
  user: { name?: string; email?: string } | null | undefined;
  pathname: string;
  avatarUrl: string;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  showUserMenu: boolean;
  setShowUserMenu: (v: boolean) => void;
  onLogout: () => void;
  router: { push: (href: string) => void };
  items: StudentNavItem[];
  theme: Theme;
  toggleTheme: () => void;
};

/** Header student — topbar blur + nút theme (bản gốc). */
export function StudentHeader({
  user,
  pathname,
  avatarUrl,
  mobileMenuOpen,
  setMobileMenuOpen,
  showUserMenu,
  setShowUserMenu,
  onLogout,
  router,
  items,
  theme,
  toggleTheme,
}: Props) {
  const logoSrc =
    theme === "dark" ? "/logo/logo_website_dark.svg" : "/logo/logo_website.svg";
  const [practiceMenuOpen, setPracticeMenuOpen] = useState(false);
  const practiceActive =
    pathname === "/student/listening" ||
    pathname === "/student/reading" ||
    pathname === "/student/writing";

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-blue-100 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/student/dashboard"
              className="flex h-12 w-[280px] max-w-[min(70vw,18rem)] shrink-0 items-center overflow-hidden sm:w-[320px] sm:max-w-[20rem]"
            >
              <img
                src={logoSrc}
                alt="TOEIC Master"
                width={320}
                height={48}
                className="block h-12 w-full object-contain object-left"
              />
            </Link>
          </div>

          {/* Nav kiểu admin: underline + glow */}
          <nav className="hidden items-center gap-6 md:flex md:shrink-0">
            {items.map((item) => {
              const isActive = item.href !== "#" && pathname === item.href;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick ?? (() => router.push(item.href))}
                  className={`student-nav-tab group relative inline-flex h-10 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-semibold transition-colors ${
                    isActive
                      ? "student-nav-tab--active text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <item.icon className="relative z-[1] h-4 w-4 shrink-0" />
                  <span className="relative z-[1]">{item.label}</span>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="student-nav-underline pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.5)]"
                    />
                  ) : null}
                </button>
              );
            })}

            <div className="relative">
              <button
                type="button"
                onClick={() => setPracticeMenuOpen((v: boolean) => !v)}
                className={`student-nav-tab group relative inline-flex h-10 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-semibold transition-colors ${
                  practiceActive
                    ? "student-nav-tab--active text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                aria-haspopup="menu"
                aria-expanded={practiceMenuOpen}
              >
                <BookOpen className="relative z-[1] h-4 w-4 shrink-0" />
                <span className="relative z-[1]">Luyện tập</span>
                <ChevronDown className="relative z-[1] h-4 w-4 shrink-0 opacity-70" />
                {practiceActive ? (
                  <span
                    aria-hidden="true"
                    className="student-nav-underline pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.5)]"
                  />
                ) : null}
              </button>

              {practiceMenuOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setPracticeMenuOpen(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        router.push("/student/listening");
                        setPracticeMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        pathname === "/student/listening"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-amber-50 hover:text-amber-900 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                      }`}
                    >
                      <Headphones className="h-4 w-4" />
                      <span className="font-medium">Luyện Nghe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.push("/student/reading");
                        setPracticeMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        pathname === "/student/reading"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-amber-50 hover:text-amber-900 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">Luyện Đọc</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.push("/student/writing");
                        setPracticeMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        pathname === "/student/writing"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-amber-50 hover:text-amber-900 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                      }`}
                    >
                      <PenTool className="h-4 w-4" />
                      <span className="font-medium">Luyện Viết</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
              aria-label={theme === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              className="relative hidden p-2 text-gray-400 transition-colors hover:text-gray-600 sm:block"
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100"
              >
                <img
                  src={
                    avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=3b82f6&color=fff`
                  }
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=3b82f6&color=fff`;
                  }}
                />
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="truncate text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      href="/student/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4" />
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      href="/student/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Cài đặt
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Trợ giúp
                    </Link>
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-gray-600 md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
