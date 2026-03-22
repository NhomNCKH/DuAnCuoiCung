'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Mic, 
  Award, 
  User, 
  LogOut,
  GraduationCap,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  // Kiểm tra xác thực - LUÔN GỌI useEffect TRƯỚC
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
    // Nếu đã đăng nhập nhưng không phải học viên (có thể là admin)
    if (!loading && user && user.role !== 'learner') {
      router.push('/admin/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  // Nếu là trang welcome, không hiển thị layout
  if (pathname === '/student') {
    return <>{children}</>;
  }

  // Hiển thị loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Nếu chưa xác thực hoặc không phải học viên, không hiển thị gì
  if (!isAuthenticated || user?.role !== 'learner') {
    return null;
  }
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
    { icon: BookOpen, label: 'Bài học', href: '/student/lessons' },
    { icon: Mic, label: 'Luyện nói AI', href: '/student/practice' },
    { icon: Award, label: 'Chứng chỉ', href: '/student/certificates' },
    { icon: User, label: 'Hồ sơ', href: '/student/profile' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar - LUÔN HIỆN */}
      <div style={{ 
        width: '256px', 
        background: 'linear-gradient(to bottom, #065f46, #115e59)',
        color: 'white',
        position: 'fixed',
        height: '100vh',
        padding: '24px',
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GraduationCap size={24} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>EduChain</div>
            <div style={{ fontSize: '12px', color: '#a7f3d0' }}>Học viên</div>
          </div>
        </div>

        {/* Hiển thị tên user */}
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          <div style={{ color: '#d1fae5' }}>Xin chào,</div>
          <div style={{ fontWeight: 'bold' }}>{user?.name || 'Học viên'}</div>
          <div style={{ fontSize: '12px', color: '#a7f3d0', marginTop: '4px' }}>
            {user?.email}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: isActive ? 'white' : '#d1fae5',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <item.icon size={20} />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              color: '#d1fae5',
              background: 'transparent',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              marginTop: '32px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={20} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Đăng xuất</span>
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: '256px', width: '100%' }}>
        <header style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
              {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: '#d1fae5',
                borderRadius: '9999px'
              }}>
                <Shield size={16} color="#047857" />
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#047857' }}>Học viên</span>
              </div>
              
              <div style={{
                width: '32px',
                height: '32px',
                background: '#059669',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {user?.name?.charAt(0) || 'HV'}
              </div>
            </div>
          </div>
        </header>

        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}