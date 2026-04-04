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
  ClipboardCheck,
  FileText,
  Award,
  User,
  LogOut,
  GraduationCap,
  ChevronDown,
  Menu,
  X,
  Bell,
  Search,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  Home,
  Settings,
  HelpCircle,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/User/Footer";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchAvatar = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setAvatarUrl(userData.avatarUrl || "");
      }
    };
    if (isAuthenticated) {
      fetchAvatar();
    }
  }, [isAuthenticated]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showExamModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showExamModal]);

  const navigationItems = [
    {
      icon: LayoutDashboard,
      label: "Tổng quan",
      href: "/student/dashboard",
    },
    {
      icon: BookOpen,
      label: "Luyện đọc",
      href: "/student/reading",
    },
    {
      icon: PenTool,
      label: "Luyện viết",
      href: "/student/writing",
    },
    {
      icon: FileText,
      label: "Kiểm tra nhanh",
      href: "/student/mock-test",
    },
    {
      icon: ClipboardCheck,
      label: "Thi thử",
      href: "/student/practicetest",
    },
    {
      icon: Award,
      label: "Đăng ký thi chứng chỉ",
      href: "#",
      onClick: () => setShowExamModal(true),
    },
  ];

  const handleRegisterExam = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setShowExamModal(false);
    setShowSuccessToast(true);
    
    // Auto hide toast after 5 seconds
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Link href="/student/dashboard" className="flex items-center gap-2">
                {/* Ảnh logo */}
                <img 
                  src="/logo/logo_website.svg"  // Đường dẫn đến file ảnh logo
                  alt="EduChain Logo"
                  className="w-60 h-12.3 object-contain"
                />
                {/* Hoặc giữ text nếu muốn
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  EduChain
                </span> */}
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick || (() => router.push(item.href))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Search Button */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=3b82f6&color=fff`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=3b82f6&color=fff`;
                    }}
                  />
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-100">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/student/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        Hồ sơ cá nhân
                      </Link>
                      <Link
                        href="/student/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Cài đặt
                      </Link>
                      <Link
                        href="/help"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <HelpCircle className="w-4 h-4" />
                        Trợ giúp
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-gray-600"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-white shadow-lg z-40 md:hidden">
            <nav className="p-4">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        router.push(item.href);
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Exam Registration Modal - Fixed Positioning */}
      <AnimatePresence>
        {showExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExamModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3, damping: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award className="w-6 h-6" />
                    Đăng ký thi chứng chỉ
                  </h3>
                  <button
                    onClick={() => setShowExamModal(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Icon and Title */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-10 h-10 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Xác nhận đăng ký thi
                  </h4>
                  <p className="text-sm text-gray-600">
                    Bạn có chắc chắn muốn đăng ký tham gia kỳ thi chứng chỉ?
                  </p>
                </div>

                {/* User Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Thông tin thí sinh
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Họ và tên:</span>
                      <span className="font-medium text-gray-900">{user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-gray-900">{user?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">
                        Lưu ý quan trọng:
                      </p>
                      <p className="text-xs text-amber-700">
                        Sau khi đăng ký, bạn sẽ nhận được thông tin chi tiết về lịch thi qua email. 
                        Vui lòng kiểm tra email thường xuyên để không bỏ lỡ thông báo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => setShowExamModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleRegisterExam}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-all ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </div>
                  ) : (
                    "Xác nhận đăng ký"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, x: 20, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20, y: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-white rounded-lg shadow-xl border-l-4 border-green-500 p-4 min-w-[320px]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Đăng ký thành công!
                  </h4>
                  <p className="text-sm text-gray-600">
                    Lịch thi sẽ được thông báo qua email và trong trang hồ sơ của bạn
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3 h-3" />
                    <span>{user?.email}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessToast(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Quick Actions */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow">
          <Sparkles className="w-6 h-6" />
        </button>
      </div>
      <Footer />
    </div>
  );
}
