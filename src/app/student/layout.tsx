// app/student/layout.tsx — compose shell (logic route + auth); UI trong features/student/shell
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  ExamRegistrationModal,
  RegistrationSuccessToast,
  StudentQuickActionFab,
} from "@/features/student/shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigationItems = useMemo(
    () => createStudentNavItems(() => setShowExamModal(true)),
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

  useEffect(() => {
    if (showExamModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showExamModal]);

  const handleRegisterExam = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowExamModal(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  if (isLoading) return <StudentLayoutLoading />;
  if (!isAuthenticated) return null;

  return (
    <div
      className={`student-app student-theme flex min-h-screen flex-col admin-theme ${theme === "dark" ? "admin-dark" : "admin-light"}`}
    >
      <StudentHeader
        user={user}
        pathname={pathname}
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
        pathname={pathname}
        router={router}
        items={navigationItems}
      />

      <main className="flex-1 bg-gray-50 pt-16">
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </main>

      <ExamRegistrationModal
        open={showExamModal}
        onClose={() => setShowExamModal(false)}
        user={user}
        isSubmitting={isSubmitting}
        onConfirm={handleRegisterExam}
      />

      <RegistrationSuccessToast
        open={showSuccessToast}
        email={user?.email}
        onDismiss={() => setShowSuccessToast(false)}
      />

      <StudentQuickActionFab />
      <Footer />
    </div>
  );
}
