'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MenuItem } from '@/types/ui';
import { USER_ROLES } from '@/lib/constants';

interface DashboardLayoutProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  title: string;
  subtitle: string;
  logo: React.ReactNode;
  allowedRoles: string[];
}

export function DashboardLayout({
  children,
  menuItems,
  title,
  subtitle,
  logo,
  allowedRoles
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication and role checks
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
      return;
    }
    
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      // Redirect based on user role
      if (user.role === USER_ROLES.ADMIN) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/student/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router, allowedRoles]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated or wrong role
  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  const currentMenuItem = menuItems.find(item => item.href === pathname);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        className="bg-gradient-to-b from-emerald-600 to-teal-600 text-white fixed h-full z-40 shadow-xl"
      >
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            {logo}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-xl font-bold">{title}</div>
                  <div className="text-xs text-emerald-200">{subtitle}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Info */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 mb-6 bg-white/10 rounded-xl"
              >
                <div className="text-emerald-100">Xin chào,</div>
                <div className="font-bold">{user.name}</div>
                <div className="text-xs text-emerald-200 mt-1">{user.email}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-emerald-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex-1"
                      >
                        <div className="font-medium">{item.label}</div>
                        {item.description && (
                          <div className="text-xs opacity-75">{item.description}</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {item.badge && !sidebarCollapsed && (
                    <span className="bg-emerald-400 text-emerald-900 text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-emerald-100 hover:bg-white/10 hover:text-white transition-all mt-8"
            >
              <LogOut size={20} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-medium"
                  >
                    Đăng xuất
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </nav>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white text-emerald-600 rounded-full p-1.5 shadow-lg hover:shadow-xl transition-shadow"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </motion.div>

      {/* Main Content */}
      <div 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 80 : 256 }}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {currentMenuItem?.label || 'Dashboard'}
              </h1>
              {currentMenuItem?.description && (
                <p className="text-gray-600">{currentMenuItem.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full">
                <Shield size={16} className="text-emerald-700" />
                <span className="text-xs font-medium text-emerald-800 capitalize">
                  {user.role}
                </span>
              </div>
              
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              className="w-64 h-full bg-gradient-to-b from-emerald-600 to-teal-600 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile menu content - same as sidebar */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
