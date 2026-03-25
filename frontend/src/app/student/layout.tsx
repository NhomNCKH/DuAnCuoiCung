// app/student/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  PenTool,
  Mic,
  FileText,
  Award,
  User,
  LogOut,
  GraduationCap,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  BarChart3,
  Settings,
  HelpCircle,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { getSignedMediaUrl } from "@/lib/media-url";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const response = await apiClient.auth.getAvatar();
        const avatarData = response.data;
        const signedAvatarUrl = avatarData?.s3Key
          ? await getSignedMediaUrl(avatarData.s3Key)
          : avatarData?.avatarUrl ?? "";
        setAvatarUrl(signedAvatarUrl ?? "");
      } catch {
        setAvatarUrl("");
      }
    };
    if (isAuthenticated) {
      fetchAvatar();
    }
  }, [isAuthenticated]);

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Tổng quan",
      href: "/student/dashboard",
      description: "Xem tiến độ học tập",
    },
    {
      icon: BookOpen,
      label: "Luyện đọc",
      href: "/student/reading",
      description: "Luyện tập kỹ năng đọc",
    },
    {
      icon: PenTool,
      label: "Luyện viết",
      href: "/student/writing",
      description: "Luyện tập kỹ năng viết",
    },
    {
      icon: Mic,
      label: "Luyện nói AI",
      href: "/student/speaking",
      description: "Phỏng vấn với AI",
    },
    {
      icon: FileText,
      label: "Thi thử",
      href: "/student/mock-test",
      description: "Làm đề thi thử",
    },
    {
      icon: Award,
      label: "Chứng chỉ",
      href: "/student/certificates",
      description: "Chứng chỉ blockchain",
    },
    {
      icon: User,
      label: "Hồ sơ",
      href: "/student/profile",
      description: "Thông tin cá nhân",
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-emerald-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        <Menu className="w-6 h-6 text-emerald-600" />
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarCollapsed ? "80px" : "280px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-emerald-800 to-teal-800 shadow-2xl z-40 ${
          mobileMenuOpen ? "block" : "hidden lg:block"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-emerald-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <div className="text-white font-bold text-xl">EduChain</div>
                  <div className="text-emerald-300 text-xs">Học viên</div>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-emerald-700/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={avatarUrl || "https://ui-avatars.com/api/?name=" + (user?.name || "User")}
                  alt="avatar"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=10b981&color=fff`;
                  }}
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-emerald-800" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user?.name}</p>
                  <p className="text-emerald-300 text-xs truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 overflow-y-auto">
            <div className="px-3 space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-white/20 text-white shadow-lg"
                        : "text-emerald-100 hover:bg-white/10"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} />
                    {!sidebarCollapsed && (
                      <div className="flex-1">
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-xs text-emerald-300/70 truncate">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-emerald-700/50 space-y-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-xl text-emerald-100 hover:bg-white/10 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
              {!sidebarCollapsed && <span className="text-sm">Thu gọn</span>}
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-emerald-100 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="text-sm">Đăng xuất</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
