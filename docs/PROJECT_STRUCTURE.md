# 📁 Cấu trúc thư mục dự án EduChain Frontend

> **Hướng dẫn chi tiết cho developer mới** - Giải thích từng thư mục và file quan trọng

## 🌳 Tổng quan cây thư mục

```
frontend/
├── 📁 .next/                    # Build output (tự động tạo)
├── 📁 .vscode/                  # VS Code settings
├── 📁 node_modules/             # Dependencies (npm install)
├── 📁 public/                   # Static files
├── 📁 src/                      # 🎯 SOURCE CODE CHÍNH
│   ├── 📁 app/                  # Next.js App Router (Pages)
│   ├── 📁 components/           # ⭐ Component library
│   ├── 📁 contexts/             # React contexts (deprecated)
│   ├── 📁 hooks/                # Custom hooks (deprecated)
│   ├── 📁 lib/                  # ⭐ Core utilities & logic
│   ├── 📁 services/             # ⚠️ Deprecated API files
│   └── 📁 types/                # ⭐ TypeScript definitions
├── 📄 .env                      # Environment variables (local)
├── 📄 .env.production           # Production environment
├── 📄 .eslintrc.json           # ESLint configuration
├── 📄 next.config.js           # Next.js configuration
├── 📄 package.json             # Dependencies & scripts
├── 📄 tailwind.config.ts       # Tailwind CSS config
├── 📄 tsconfig.json            # TypeScript config
└── 📄 vercel.json              # Vercel deployment config
```

---

## 🎯 **SRC/ - Thư mục source code chính**

### 📁 **app/ - Next.js App Router (Routing & Pages)**
```
src/app/
├── 📁 admin/                    # 👨‍💼 Admin pages
│   ├── 📁 certificates/         # Quản lý chứng chỉ
│   ├── 📁 dashboard/            # Dashboard admin
│   ├── 📁 exams/                # Quản lý đề thi
│   ├── 📁 questions/            # Quản lý câu hỏi
│   ├── 📁 users/                # Quản lý người dùng
│   ├── 📄 layout.tsx            # Layout chung cho admin
│   └── 📄 page.tsx              # Trang admin chính
├── 📁 api/                      # API routes
│   └── 📁 proxy/                # Proxy to backend API
├── 📁 login/                    # 🔐 Trang đăng nhập
├── 📁 register/                 # 📝 Trang đăng ký
├── 📁 student/                  # 👨‍🎓 Student pages
│   ├── 📁 certificates/         # Chứng chỉ của học viên
│   ├── 📁 dashboard/            # Dashboard học viên
│   ├── 📁 mock-test/            # Thi thử
│   ├── 📁 profile/              # Hồ sơ cá nhân
│   ├── 📁 reading/              # Luyện đọc
│   ├── 📁 writing/              # Luyện viết
│   ├── 📄 layout.tsx            # Layout chung cho student
│   └── 📄 page.tsx              # Trang student chính
├── 📄 favicon.ico               # Website icon
├── 📄 globals.css               # Global CSS styles
├── 📄 layout.tsx                # Root layout
└── 📄 page.tsx                  # 🏠 Trang chủ
```

**🔍 Cách hoạt động:**
- `app/admin/dashboard/page.tsx` → URL: `/admin/dashboard`
- `app/student/profile/page.tsx` → URL: `/student/profile`
- `layout.tsx` files tự động wrap các page con

---

### ⭐ **components/ - Component Library (Tái sử dụng)**
```
src/components/
├── 📁 ui/                       # 🎨 UI Components cơ bản
│   ├── 📄 Badge.tsx             # Nhãn trạng thái (Active, Inactive...)
│   ├── 📄 Button.tsx            # Nút bấm thống nhất
│   ├── 📄 CertificateCard.tsx   # Card hiển thị chứng chỉ
│   ├── 📄 EnhancedStatCard.tsx  # Card thống kê nâng cao (Admin)
│   ├── 📄 InfoCard.tsx          # Card thông tin tổng quát
│   ├── 📄 Input.tsx             # Ô nhập liệu
│   ├── 📄 StatCard.tsx          # Card thống kê cơ bản
│   ├── 📄 StudentStatCard.tsx   # Card thống kê (Student)
│   ├── 📄 UserCard.tsx          # Card hiển thị user
│   ├── 📄 WelcomeHeader.tsx     # Header chào mừng
│   └── 📄 index.ts              # Export tất cả components
├── 📁 forms/                    # 📝 Form Components
│   ├── 📄 LoginForm.tsx         # Form đăng nhập
│   ├── 📄 RegisterForm.tsx      # Form đăng ký
│   └── 📄 index.ts              # Export forms
└── 📁 layout/                   # 🏗️ Layout Components
    ├── 📄 DashboardLayout.tsx   # Layout dashboard chung
    └── 📄 index.ts              # Export layouts
```

**🔍 Cách sử dụng:**
```typescript
// Import components
import { Button, Badge, EnhancedStatCard } from '@/components/ui';
import { LoginForm } from '@/components/forms';
import { DashboardLayout } from '@/components/layout';

// Sử dụng
<EnhancedStatCard 
  icon={Users} 
  label="Tổng học viên" 
  value="1,234" 
  change="+12%" 
/>
```

---

### ⭐ **lib/ - Core Logic & Utilities**
```
src/lib/
├── 📁 auth/                     # Authentication utilities
├── 📁 constants/                # 📋 Hằng số ứng dụng
│   └── 📄 index.ts              # Routes, storage keys, etc.
├── 📁 contexts/                 # ⚛️ React Contexts
│   └── 📄 AuthContext.tsx       # Authentication context
├── 📁 hooks/                    # 🪝 Custom React Hooks
│   ├── 📄 useApi.ts             # Hook gọi API
│   ├── 📄 useAuth.ts            # Hook authentication
│   ├── 📄 useLocalStorage.ts    # Hook localStorage
│   └── 📄 index.ts              # Export hooks
├── 📁 utils/                    # 🛠️ Utility functions
│   └── 📄 index.ts              # Helper functions
├── 📄 api-client.ts             # ⭐ API Client chính
└── 📄 legacy-support.ts         # Backward compatibility
```

**🔍 Files quan trọng:**

#### **api-client.ts** - API Client chính
```typescript
// Centralized API management
class ApiClient {
  auth = {
    login: (data) => this.request('/auth/login', {...}),
    register: (data) => this.request('/auth/register', {...}),
    getProfile: () => this.request('/auth/me', {...})
  }
}

export const apiClient = new ApiClient();
```

#### **contexts/AuthContext.tsx** - Authentication State
```typescript
// Global authentication state
export const AuthContext = createContext<AuthContextType>();
// Provides: user, isAuthenticated, login, logout, etc.
```

#### **hooks/useAuth.ts** - Authentication Hook
```typescript
// Easy access to auth state
export function useAuth() {
  const { user, isAuthenticated, login, logout } = useContext(AuthContext);
  return { user, isAuthenticated, login, logout };
}
```

---

### ⭐ **types/ - TypeScript Definitions**
```
src/types/
├── 📄 api.ts                    # API response types
├── 📄 auth.ts                   # Authentication types
└── 📄 ui.ts                     # UI component types
```

**🔍 Ví dụ types:**
```typescript
// auth.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'learner' | 'instructor';
  // ... other fields
}

// api.ts  
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}
```

---

### ⚠️ **Deprecated Folders (Không dùng nữa)**
```
src/
├── 📁 contexts/                 # ❌ Cũ - dùng lib/contexts/
├── 📁 hooks/                    # ❌ Cũ - dùng lib/hooks/
└── 📁 services/                 # ❌ Cũ - dùng lib/api-client.ts
```

---

## 🚀 **Cách làm việc với cấu trúc này**

### **1. Tạo trang mới:**
```bash
# Tạo admin page mới
mkdir src/app/admin/reports
touch src/app/admin/reports/page.tsx

# Tạo student page mới  
mkdir src/app/student/speaking
touch src/app/student/speaking/page.tsx
```

### **2. Tạo component mới:**
```bash
# Tạo UI component
touch src/components/ui/Modal.tsx
# Thêm vào src/components/ui/index.ts
```

### **3. Thêm API endpoint:**
```typescript
// Trong src/lib/api-client.ts
class ApiClient {
  // Thêm method mới
  reports = {
    getAll: () => this.request('/reports', { method: 'GET' }),
    create: (data) => this.request('/reports', { method: 'POST', body: JSON.stringify(data) })
  }
}
```

### **4. Tạo type mới:**
```typescript
// Trong src/types/api.ts hoặc tạo file mới
export interface Report {
  id: string;
  title: string;
  createdAt: string;
}
```

---

## 📋 **Import Paths Chuẩn**

```typescript
// Pages & Components
import HomePage from '@/app/page';
import { Button, Badge } from '@/components/ui';
import { LoginForm } from '@/components/forms';
import { DashboardLayout } from '@/components/layout';

// Logic & Utilities  
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks';
import { AuthContext } from '@/lib/contexts/AuthContext';

// Types
import { User, AuthContextType } from '@/types/auth';
import { ApiResponse } from '@/types/api';
```

---

## 🎯 **Best Practices**

### **✅ DO:**
- Sử dụng components từ `@/components/ui`
- Import từ `@/lib/api-client` cho API calls
- Sử dụng `@/lib/hooks` cho custom hooks
- Đặt types trong `@/types/`
- Follow naming convention: PascalCase cho components, camelCase cho functions

### **❌ DON'T:**
- Import từ `@/services/` (deprecated)
- Import từ `@/hooks/` hoặc `@/contexts/` (deprecated)
- Tạo component inline trong pages (tách ra `@/components/`)
- Hard-code API URLs (dùng api-client)

---

## 🔧 **Scripts hữu ích**

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build production
npm run lint         # Check linting
npm run type-check   # Check TypeScript

# File operations
find src/ -name "*.tsx" | grep -E "(page|layout)" # Tìm tất cả pages
find src/components/ -name "*.tsx"                 # Tìm tất cả components
```

---

## 📞 **Khi cần help:**

1. **Tạo component mới** → Xem `src/components/ui/Button.tsx` làm mẫu
2. **Tạo page mới** → Xem `src/app/admin/dashboard/page.tsx` làm mẫu  
3. **Gọi API** → Xem `src/lib/api-client.ts` và cách dùng trong pages
4. **Authentication** → Xem `src/lib/hooks/useAuth.ts` và `AuthContext`
5. **TypeScript errors** → Check `src/types/` cho type definitions

**Happy coding! 🚀**