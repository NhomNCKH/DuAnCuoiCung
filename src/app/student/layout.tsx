// app/student/layout.tsx — compose shell (logic route + auth); UI trong features/student/shell
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import Footer from "@/components/User/Footer";
import { getStoredUserProfile } from "@/lib/auth-session";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";
import {
  createStudentNavItems,
  StudentLayoutLoading,
  StudentHeader,
  StudentMobileNav,
  StudentQuickActionFab,
} from "@/features/student/shell";
import GlobalVocabularyLookup from "@/features/student/shell/GlobalVocabularyLookup";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationItems = useMemo(
    () => createStudentNavItems(),
    [],
  );

  const loadHeaderAvatar = useCallback(async () => {
    const storedUser = getStoredUserProfile();

    // Fast path: use cached URL first (if any)
    setAvatarUrl(storedUser?.avatarUrl || "");

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
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isLoading, isAuthenticated, router]);

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

  // Đăng ký thi chứng chỉ đã được chuyển sang page riêng:
  // /student/certificates/register

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  if (isLoading) return <StudentLayoutLoading />;
  if (!isAuthenticated) return null;

  const isOfficialExamFullscreen =
    safePathname.startsWith("/student/mock-test/") &&
    searchParams?.get("official") === "1";

  if (isOfficialExamFullscreen) {
    return (
      <div
        className={`student-app student-theme min-h-screen bg-gray-50 admin-theme ${theme === "dark" ? "admin-dark" : "admin-light"}`}
      >
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  return (
    <div
      className={`student-app student-theme flex min-h-screen flex-col admin-theme ${theme === "dark" ? "admin-dark" : "admin-light"}`}
    >
      <StudentHeader
        user={user}
        pathname={safePathname}
        avatarUrl={avatarUrl}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        onLogout={handleLogout}
        router={router}
        items={navigationItems}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <StudentMobileNav
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pathname={safePathname}
        router={router}
        items={navigationItems}
      />

      <main className="flex-1 bg-gray-50 pt-16">
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </main>

      <GlobalVocabularyLookup />
      <StudentQuickActionFab />
      <Footer />
    </div>
  );
}
