// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Leaf,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Shield,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  Sparkles,
  GraduationCap,
  Target,
  Clock,
  CheckCircle2,
  Quote,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/student/dashboard";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response: any = await api.auth.login({ email, password });

      if (response.statusCode === 200) {
        const user = response.data?.user || response.data?.data?.user;
        const accessToken = response.data?.accessToken || response.data?.data?.accessToken;
        const refreshToken = response.data?.refreshToken || response.data?.data?.refreshToken;

        if (user && accessToken) {
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          localStorage.setItem("user", JSON.stringify(user));

          if (user.role === "admin") {
            router.push("/admin/dashboard");
          } else {
            router.push(redirect);
          }
        } else {
          setError("Dữ liệu đăng nhập không hợp lệ");
        }
      } else {
        setError(response.message || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.statusCode === 400) {
        setError("Email hoặc mật khẩu không đúng");
      } else if (err.statusCode === 403) {
        setError("Tài khoản tạm thời bị khóa. Vui lòng thử lại sau");
      } else {
        setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  const achievements = [
    { icon: Users, value: "50,000+", label: "Học viên" },
    { icon: Award, value: "98%", label: "Hài lòng" },
    { icon: TrendingUp, value: "+150", label: "Điểm TB" },
    { icon: BookOpen, value: "2,000+", label: "Bài tập" },
  ];

  const features = [
    "Lộ trình học cá nhân hóa với AI",
    "Chấm điểm và phản hồi tức thì",
    "Chứng chỉ Blockchain không thể làm giả",
    "Hơn 2000+ bài tập thực hành",
  ];

  const testimonials = [
    {
      name: "Nguyễn Thị Minh Anh",
      role: "Sinh viên năm 3",
      score: "TOEIC 865",
      quote: "Sau 3 tháng học, điểm TOEIC của mình tăng từ 550 lên 865. AI chấm bài rất chính xác!",
      avatar: "https://ui-avatars.com/api/?name=Minh+Anh&background=10b981&color=fff",
    },
    {
      name: "Trần Văn Hoàng",
      role: "Nhân viên văn phòng",
      score: "TOEIC 920",
      quote: "Giao diện thân thiện, lộ trình học rõ ràng. Đặc biệt phần luyện nói AI rất hữu ích.",
      avatar: "https://ui-avatars.com/api/?name=Van+Hoang&background=10b981&color=fff",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-6rem)]">
          {/* Left Side - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 bg-clip-text text-transparent">
                  EduChain
                </span>
                <div className="text-xs text-emerald-600">TOEIC Preparation</div>
              </div>
            </div>

            {/* Main Title */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Nền tảng học TOEIC số 1 Việt Nam
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="text-emerald-900">Chào mừng bạn</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  trở lại!
                </span>
              </h1>
              <p className="text-lg text-emerald-700 leading-relaxed">
                Tiếp tục hành trình chinh phục TOEIC của bạn. 
                Hôm nay có <span className="font-semibold">24 bài học mới</span> đang chờ đón!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {achievements.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-emerald-700">{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Features */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-emerald-100">
              <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Bạn sẽ nhận được:
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Học viên nói gì?</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {testimonials.map((testimonial, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-800">{testimonial.name}</p>
                        <p className="text-[10px] text-emerald-600">{testimonial.score}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{testimonial.quote}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-emerald-100">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 bg-clip-text text-transparent">
                    EduChain
                  </span>
                </div>
                <p className="text-emerald-600 text-sm">Đăng nhập để tiếp tục học tập</p>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-emerald-800">Chào mừng trở lại</h2>
                <p className="text-emerald-600 text-sm">Đăng nhập để tiếp tục luyện tập</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-emerald-800 placeholder-emerald-400 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-emerald-300" />
                    <span className="text-sm text-emerald-600">Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-emerald-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-emerald-500">Hoặc tiếp tục với</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="py-3 px-4 bg-white rounded-xl text-[#4285F4] font-medium hover:bg-blue-50 transition-colors border border-gray-200 flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

              <p className="text-center text-sm text-emerald-600 mt-6">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-emerald-700 font-semibold hover:underline">
                  Đăng ký ngay
                </Link>
              </p>

              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-emerald-100">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-500">Bảo mật với công nghệ Blockchain</span>
              </div>
            </div>

            {/* Mobile Features */}
            <div className="lg:hidden mt-6 grid grid-cols-2 gap-3">
              {features.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 bg-white/60 rounded-lg p-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}