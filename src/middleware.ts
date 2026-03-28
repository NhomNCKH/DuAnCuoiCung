// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Các route public không cần đăng nhập
const publicRoutes = ['/', '/login', '/register'];

export function middleware(request: NextRequest) {
  // const token = request.cookies.get('access_token')?.value;
  // const path = request.nextUrl.pathname;

  // // Kiểm tra nếu đã đăng nhập và cố gắng vào trang chủ
  // if (token && (path === '/' || path === '/login' || path === '/register')) {
  //   // Lấy user role từ cookie hoặc localStorage
  //   // Tạm thời chuyển đến dashboard
  //   return NextResponse.redirect(new URL('/student/dashboard', request.url));
  // }

  // // Kiểm tra nếu chưa đăng nhập và vào route cần xác thực
  // if (!token && !publicRoutes.includes(path) && !path.startsWith('/_next')) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};