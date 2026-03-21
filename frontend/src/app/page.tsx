"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Leaf,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  ArrowRight,
  Shield,
  Bot,
  Sparkles,
  Award,
  MessageSquare,
  Zap,
  AlertCircle,
} from "lucide-react";
import { api } from "@/services/api";

export default function HomePage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    if (isLogin) {
      // Đăng nhập
      const response: any = await api.auth.login({ email, password });
      
      console.log("=== FULL RESPONSE ===", response);
      console.log("response.data:", response.data);
      
      if (response.statusCode === 200) {
        const user = response.data?.user || response.data?.data?.user;
        const accessToken = response.data?.accessToken || response.data?.data?.accessToken;
        const refreshToken = response.data?.refreshToken || response.data?.data?.refreshToken;
        
        console.log("Extracted user:", user);
        console.log("Extracted accessToken:", accessToken);
        
        if (user && accessToken) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          if (user.role === "admin") {
            router.push("/admin/dashboard");
          } else {
            router.push("/student/dashboard");
          }
        } else {
          setError("Dữ liệu đăng nhập không hợp lệ");
        }
      } else {
        setError(response.message || "Đăng nhập thất bại");
      }
    } else {
      // Đăng ký
      const response: any = await api.auth.register({ name, email, password });
      
      console.log("Register response:", response);
      
      if (response.statusCode === 200) {
        const loginResponse: any = await api.auth.login({ email, password });
        
        if (loginResponse.statusCode === 200 && loginResponse.data) {
          const user = loginResponse.data.user || loginResponse.data.data?.user;
          const accessToken = loginResponse.data.accessToken || loginResponse.data.data?.accessToken;
          const refreshToken = loginResponse.data.refreshToken || loginResponse.data.data?.refreshToken;
          
          if (user && accessToken) {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            router.push("/student/dashboard");
          } else {
            setError("Đăng nhập sau đăng ký thất bại");
          }
        } else {
          setError(loginResponse.message || "Đăng nhập sau đăng ký thất bại");
        }
      } else {
        setError(response.message || "Đăng ký thất bại");
      }
    }
  } catch (err: any) {
    console.error("Auth error:", err);
    
    if (err.statusCode === 400) {
      setError("Email hoặc mật khẩu không đúng");
    } else if (err.statusCode === 403) {
      setError("Tài khoản tạm thời bị khóa. Vui lòng thử lại sau");
    } else if (err.statusCode === 409) {
      setError("Email đã được đăng ký. Vui lòng sử dụng email khác");
    } else {
      setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-emerald-800">
                EduChain
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                TOEIC
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-6"
            >
              <div className="hidden md:flex items-center space-x-6">
                <a
                  href="#tinh-nang"
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  Tính năng
                </a>
                <a
                  href="#lo-trinh"
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  Lộ trình
                </a>
                <a
                  href="#hoc-phi"
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  Học phí
                </a>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-100 rounded-full">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-medium text-emerald-800">
                  Blockchain Verified
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center space-x-2 bg-emerald-100 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  AI-Powered Learning
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-emerald-900 mb-6">
                Chinh phục TOEIC
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  với AI & Blockchain
                </span>
              </h1>

              <p className="text-lg text-emerald-700 mb-8 leading-relaxed">
                Trải nghiệm phỏng vấn AI thông minh, chấm điểm chính xác và
                chứng chỉ được bảo mật tuyệt đối bằng công nghệ Blockchain. Hơn
                10,000+ học viên đã tin dùng.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3 mb-10">
                <div className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <Bot className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-800">AI Interview</span>
                </div>
                <div className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-800">
                    Blockchain Cert
                  </span>
                </div>
                <div className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-800">
                    Real-time Feedback
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-emerald-800">
                    10k+
                  </div>
                  <div className="text-sm text-emerald-600">Học viên</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-800">
                    50k+
                  </div>
                  <div className="text-sm text-emerald-600">Bài luyện</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-800">98%</div>
                  <div className="text-sm text-emerald-600">Tăng điểm</div>
                </div>
              </div>
            </motion.div>

            {/* Right side - Login/Register Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-emerald-100">
                {/* Form Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-emerald-800 mb-2">
                    {isLogin ? "Chào mừng trở lại" : "Bắt đầu ngay"}
                  </h2>
                  <p className="text-emerald-600">
                    {isLogin
                      ? "Đăng nhập để tiếp tục luyện tập"
                      : "Tạo tài khoản để trải nghiệm AI"}
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Toggle Buttons */}
                <div className="flex bg-emerald-50 rounded-2xl p-1 mb-8">
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setError("");
                    }}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      isLogin
                        ? "bg-white text-emerald-700 shadow-md"
                        : "text-emerald-600 hover:text-emerald-800"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setError("");
                    }}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      !isLogin
                        ? "bg-white text-emerald-700 shadow-md"
                        : "text-emerald-600 hover:text-emerald-800"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Đăng ký</span>
                    </div>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                        <input
                          type="text"
                          placeholder="Họ và tên"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400"
                          required={!isLogin}
                          disabled={loading}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input
                      type="password"
                      placeholder="Mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400"
                      required
                      disabled={loading}
                    />
                  </div>

                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-emerald-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-emerald-500">
                      Hoặc tiếp tục với
                    </span>
                  </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-4">
                  <button className="py-3 px-4 bg-white rounded-xl text-[#4285F4] font-medium hover:bg-blue-50 transition-colors border border-gray-200 flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button className="py-3 px-4 bg-[#1877F2] rounded-xl text-white font-medium hover:bg-[#166FE5] transition-colors flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>

                {/* Terms */}
                <p className="text-xs text-center text-emerald-500 mt-6">
                  Bằng việc {isLogin ? "đăng nhập" : "đăng ký"}, bạn đồng ý với{" "}
                  <button className="text-emerald-700 hover:underline font-medium">
                    Điều khoản
                  </button>{" "}
                  và{" "}
                  <button className="text-emerald-700 hover:underline font-medium">
                    Chính sách
                  </button>
                </p>
              </div>
            </motion.div>
          </div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-24"
          >
            <h2 className="text-3xl font-bold text-center text-emerald-800 mb-12">
              Tại sao chọn <span className="text-emerald-600">EduChain</span>?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-800 mb-2">
                  AI Interview
                </h3>
                <p className="text-emerald-600">
                  Luyện nói với AI chấm điểm phát âm, ngữ điệu và phản hồi
                  real-time
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-800 mb-2">
                  Blockchain Cert
                </h3>
                <p className="text-emerald-600">
                  Chứng chỉ được xác thực và bảo mật trên Blockchain, không thể
                  làm giả
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-800 mb-2">
                  Lộ trình cá nhân
                </h3>
                <p className="text-emerald-600">
                  AI phân tích điểm mạnh/yếu và đề xuất lộ trình học phù hợp
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Leaf className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-800 font-semibold">EduChain</span>
              <span className="text-xs text-emerald-500">© 2024</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-emerald-600 hover:text-emerald-800">
                Giới thiệu
              </a>
              <a href="#" className="text-emerald-600 hover:text-emerald-800">
                Liên hệ
              </a>
              <a href="#" className="text-emerald-600 hover:text-emerald-800">
                Điều khoản
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}